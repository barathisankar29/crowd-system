from db import get_session
from models import DispatchRecord, Personnel
from services_incidents import parse_display_id, record_dispatch_note

ALLOWED_TARGET_TYPES = {"officer", "zone", "all"}


def list_dispatch(incident_display_id: str | None = None):
    with get_session() as session:
        query = session.query(DispatchRecord)
        if incident_display_id:
            incident_id = parse_display_id(incident_display_id)
            query = query.filter(DispatchRecord.incident_id == incident_id)
        rows = query.order_by(DispatchRecord.created_at.desc()).all()
        return [row.to_dict() for row in rows]


def create_dispatch(payload: dict, actor: str):
    target_type = str(payload.get("targetType") or "").strip().lower()
    message = str(payload.get("message") or "").strip()

    if target_type not in ALLOWED_TARGET_TYPES:
        raise ValueError("targetType must be one of: officer, zone, all")
    if not message:
        raise ValueError("Message is required")

    incident_id = None
    if payload.get("incidentId"):
        incident_id = parse_display_id(payload["incidentId"])
        if incident_id is None:
            raise ValueError(f"Unknown incident id '{payload['incidentId']}'")

    target_personnel = None
    target_zone = None

    with get_session() as session:
        if target_type == "officer":
            personnel_id = payload.get("targetPersonnelId")
            target_personnel = session.query(Personnel).filter(Personnel.personnel_id == personnel_id).first()
            if target_personnel is None:
                raise ValueError(f"Unknown personnel id '{personnel_id}'")
        elif target_type == "zone":
            target_zone = str(payload.get("targetZone") or "").strip()
            if not target_zone:
                raise ValueError("targetZone is required for a zone dispatch")

        record = DispatchRecord(
            incident_id=incident_id,
            target_type=target_type,
            target_personnel_id=target_personnel.id if target_personnel else None,
            target_zone=target_zone,
            message=message,
            created_by=actor or "Control",
        )
        session.add(record)
        session.flush()
        result = record.to_dict()

    if incident_id is not None:
        label = target_personnel.name if target_personnel else (target_zone or "ALL units")
        record_dispatch_note(incident_id, label, message)

    return result
