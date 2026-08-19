import re
import time
from datetime import datetime, timezone

from db import get_session
from models import DispatchRecord, Incident, IncidentNote, Personnel

_ID_RE = re.compile(r"^INC-0*(\d+)$", re.IGNORECASE)

SEVERITY_TO_ALERT = {"critical": "HIGH", "high": "HIGH", "medium": "MODERATE", "low": "MODERATE"}


def parse_display_id(display_id: str) -> int | None:
    match = _ID_RE.match((display_id or "").strip())
    return int(match.group(1)) if match else None


def _query(session, severity=None, status=None, zone=None, q=None):
    query = session.query(Incident)
    if severity and severity != "all":
        query = query.filter(Incident.severity == severity)
    if status and status != "all":
        query = query.filter(Incident.status == status)
    if zone and zone != "all":
        query = query.filter(Incident.zone == zone)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            (Incident.description.ilike(like)) | (Incident.alert_type.ilike(like)) | (Incident.zone.ilike(like))
        )
    return query.order_by(Incident.updated_at.desc())


def list_incidents(severity=None, status=None, zone=None, q=None):
    with get_session() as session:
        rows = _query(session, severity, status, zone, q).all()
        return [row.to_dict() for row in rows]


def get_incident(display_id: str):
    incident_id = parse_display_id(display_id)
    if incident_id is None:
        return None
    with get_session() as session:
        incident = session.get(Incident, incident_id)
        return incident.to_dict(include_notes=True) if incident else None


def update_incident(display_id: str, status: str | None, actor: str):
    incident_id = parse_display_id(display_id)
    if incident_id is None:
        return None

    with get_session() as session:
        incident = session.get(Incident, incident_id)
        if incident is None:
            return None

        if status and status != incident.status:
            note = IncidentNote(
                incident_id=incident.id,
                author=actor or "Control",
                note=f"Status changed: {incident.status} → {status}",
                kind="status",
            )
            incident.status = status
            if status == "resolved":
                incident.resolved_at = datetime.now(timezone.utc)
            session.add(note)

        session.flush()
        return incident.to_dict(include_notes=True)


def assign_personnel(display_id: str, personnel_id: str | None, actor: str):
    incident_id = parse_display_id(display_id)
    if incident_id is None:
        return None

    with get_session() as session:
        incident = session.get(Incident, incident_id)
        if incident is None:
            return None

        person = None
        if personnel_id:
            person = session.query(Personnel).filter(Personnel.personnel_id == personnel_id).first()
            if person is None:
                raise ValueError(f"Unknown personnel id '{personnel_id}'")

        incident.assigned_personnel_id = person.id if person else None
        label = person.name if person else "unassigned"
        session.add(IncidentNote(
            incident_id=incident.id, author=actor or "Control",
            note=f"Assigned to {label}", kind="status",
        ))
        session.flush()
        return incident.to_dict(include_notes=True)


def add_note(display_id: str, author: str, note_text: str):
    incident_id = parse_display_id(display_id)
    if incident_id is None:
        return None
    if not note_text or not note_text.strip():
        raise ValueError("Note text is required")

    with get_session() as session:
        incident = session.get(Incident, incident_id)
        if incident is None:
            return None
        session.add(IncidentNote(incident_id=incident.id, author=author or "Field", note=note_text.strip(), kind="note"))
        session.flush()
        return incident.to_dict(include_notes=True)


def record_dispatch_note(incident_id: int, target_label: str, message: str):
    with get_session() as session:
        incident = session.get(Incident, incident_id)
        if incident is None:
            return
        session.add(IncidentNote(
            incident_id=incident.id, author="Control",
            note=f"Dispatched to {target_label}: {message}", kind="dispatch",
        ))


def recent_alerts(limit: int = 20):
    with get_session() as session:
        rows = session.query(Incident).order_by(Incident.updated_at.desc()).limit(limit).all()
        return [
            {
                "id": row.display_id,
                "title": f"Zone {row.zone} — {row.alert_type}" if row.zone else row.alert_type,
                "severity": SEVERITY_TO_ALERT.get(row.severity, "MODERATE"),
                "timestamp": row.updated_at.strftime("%H:%M:%S"),
            }
            for row in rows
        ]


# ---- called from the detection loop (pipeline.py) on every inference cycle ----

_ZONE_ALERT_TYPES = {"high": "Crowd Surge", "critical": "Crowd Surge", "medium": "Crowd Build-up"}


def sync_from_detection(zone_counts: dict, capacities: dict, density: float, anomaly_score: float):
    """Edge-triggered incident creation: one open incident per zone at a time.
    A zone re-entering a threshold band updates its existing open incident
    rather than spawning a new one; a fresh incident only opens once the
    previous one for that zone has been resolved by an operator."""
    with get_session() as session:
        for zone, count in zone_counts.items():
            capacity = max(1, capacities.get(zone, 5))
            fill = (count / capacity) * 100

            if fill < 50:
                continue

            if fill >= 80:
                severity = "critical" if anomaly_score >= 0.65 else "high"
                status = "active"
            else:
                severity = "medium"
                status = "monitoring"

            open_incident = (
                session.query(Incident)
                .filter(Incident.zone == zone, Incident.status != "resolved")
                .order_by(Incident.created_at.desc())
                .first()
            )

            if open_incident:
                open_incident.crowd_count = count
                open_incident.density = density
                open_incident.severity = severity
                open_incident.alert_type = _ZONE_ALERT_TYPES.get(severity, "Crowd Build-up")
                if status == "active" and open_incident.status == "monitoring":
                    open_incident.status = "active"
            else:
                session.add(Incident(
                    zone=zone,
                    crowd_count=count,
                    density=density,
                    severity=severity,
                    status=status,
                    alert_type=_ZONE_ALERT_TYPES.get(severity, "Crowd Build-up"),
                    description=f"Zone {zone} reached {fill:.0f}% of its {capacity}-person capacity.",
                    source="auto",
                ))
