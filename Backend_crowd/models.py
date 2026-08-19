from datetime import datetime, timezone

from sqlalchemy import ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Personnel(Base):
    __tablename__ = "personnel"

    id: Mapped[int] = mapped_column(primary_key=True)
    personnel_id: Mapped[str] = mapped_column(unique=True, index=True)
    name: Mapped[str] = mapped_column()
    rank: Mapped[str] = mapped_column(default="")
    phone: Mapped[str] = mapped_column(default="")
    email: Mapped[str] = mapped_column(default="")
    department: Mapped[str] = mapped_column(default="")
    zone: Mapped[str] = mapped_column(default="")
    shift: Mapped[str] = mapped_column(default="")
    status: Mapped[str] = mapped_column(default="on-duty")
    created_at: Mapped[datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime] = mapped_column(default=_now, onupdate=_now)
    last_activity_at: Mapped[datetime | None] = mapped_column(default=None, nullable=True)

    def to_dict(self):
        return {
            "id": self.personnel_id,
            "name": self.name,
            "rank": self.rank,
            "phone": self.phone,
            "email": self.email,
            "department": self.department,
            "zone": self.zone,
            "shift": self.shift,
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "lastActivityAt": self.last_activity_at.isoformat() if self.last_activity_at else None,
        }


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime] = mapped_column(default=_now, onupdate=_now)
    resolved_at: Mapped[datetime | None] = mapped_column(default=None, nullable=True)

    severity: Mapped[str] = mapped_column(default="medium")
    zone: Mapped[str] = mapped_column(default="")
    crowd_count: Mapped[int] = mapped_column(default=0)
    density: Mapped[float] = mapped_column(default=0.0)
    alert_type: Mapped[str] = mapped_column(default="")
    status: Mapped[str] = mapped_column(default="active")
    description: Mapped[str] = mapped_column(default="")
    source: Mapped[str] = mapped_column(default="auto")

    assigned_personnel_id: Mapped[int | None] = mapped_column(
        ForeignKey("personnel.id"), nullable=True
    )
    assigned_personnel: Mapped["Personnel | None"] = relationship()

    notes: Mapped[list["IncidentNote"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="IncidentNote.created_at"
    )

    @property
    def display_id(self) -> str:
        return f"INC-{self.id:06d}"

    def to_dict(self, include_notes: bool = False):
        data = {
            "id": self.display_id,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "resolvedAt": self.resolved_at.isoformat() if self.resolved_at else None,
            "severity": self.severity,
            "zone": self.zone,
            "crowdCount": self.crowd_count,
            "density": self.density,
            "alertType": self.alert_type,
            "status": self.status,
            "description": self.description,
            "source": self.source,
            "assignedTo": self.assigned_personnel.to_dict() if self.assigned_personnel else None,
        }
        if include_notes:
            data["notes"] = [n.to_dict() for n in self.notes]
        return data


class IncidentNote(Base):
    __tablename__ = "incident_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"))
    incident: Mapped["Incident"] = relationship(back_populates="notes")
    author: Mapped[str] = mapped_column(default="")
    note: Mapped[str] = mapped_column()
    kind: Mapped[str] = mapped_column(default="note")  # note | status | dispatch | auto
    created_at: Mapped[datetime] = mapped_column(default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "author": self.author,
            "note": self.note,
            "kind": self.kind,
            "createdAt": self.created_at.isoformat(),
        }


class DispatchRecord(Base):
    __tablename__ = "dispatch_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    target_type: Mapped[str] = mapped_column(default="all")  # officer | zone | all
    target_personnel_id: Mapped[int | None] = mapped_column(ForeignKey("personnel.id"), nullable=True)
    target_personnel: Mapped["Personnel | None"] = relationship()
    target_zone: Mapped[str | None] = mapped_column(default=None, nullable=True)
    message: Mapped[str] = mapped_column()
    created_by: Mapped[str] = mapped_column(default="Control")
    created_at: Mapped[datetime] = mapped_column(default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "incidentId": f"INC-{self.incident_id:06d}" if self.incident_id else None,
            "targetType": self.target_type,
            "target": self.target_personnel.to_dict()["name"] if self.target_personnel else (
                self.target_zone if self.target_zone else "ALL"
            ),
            "message": self.message,
            "createdBy": self.created_by,
            "createdAt": self.created_at.isoformat(),
        }


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(default=_now, index=True)
    count: Mapped[int] = mapped_column(default=0)
    density: Mapped[float] = mapped_column(default=0.0)
    zones_json: Mapped[str] = mapped_column(default="{}")

    def to_dict(self):
        return {
            "time": self.ts.strftime("%H:%M:%S"),
            "count": self.count,
            "density": self.density,
        }


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(unique=True)
    label: Mapped[str] = mapped_column()

    def to_dict(self):
        return {"key": self.key, "label": self.label}


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(unique=True)
    label: Mapped[str] = mapped_column()

    def to_dict(self):
        return {"key": self.key, "label": self.label}


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"))
