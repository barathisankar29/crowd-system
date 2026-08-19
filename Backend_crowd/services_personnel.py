import re
from datetime import datetime, timezone

import openpyxl

from config import ZONE_NAMES
from db import get_session
from models import Personnel

ALLOWED_STATUS = {"on-duty", "responding", "break", "off-duty", "inactive"}
PHONE_RE = re.compile(r"^[\d+()\-\s]{7,20}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Flexible header aliases so real-world spreadsheets don't have to match exactly.
COLUMN_ALIASES = {
    "personnel_id": {"personnel id", "id", "badge", "badge id"},
    "name": {"name", "full name"},
    "rank": {"rank", "role", "rank / role"},
    "phone": {"phone", "phone number", "mobile"},
    "email": {"email", "email address"},
    "department": {"department", "dept"},
    "zone": {"zone", "assigned zone"},
    "shift": {"shift"},
    "status": {"status", "availability", "availability / status"},
}
REQUIRED_COLUMNS = {"personnel_id", "name"}


def list_personnel(status=None, zone=None):
    with get_session() as session:
        query = session.query(Personnel)
        if status and status != "all":
            query = query.filter(Personnel.status == status)
        if zone and zone != "all":
            query = query.filter(Personnel.zone == zone)
        return [row.to_dict() for row in query.order_by(Personnel.name).all()]


def get_personnel(personnel_id: str):
    with get_session() as session:
        row = session.query(Personnel).filter(Personnel.personnel_id == personnel_id).first()
        return row.to_dict() if row else None


def _validate_payload(payload: dict, *, require_id=True):
    errors = []
    if require_id and not str(payload.get("id") or payload.get("personnel_id") or "").strip():
        errors.append("Personnel ID is required")
    if not str(payload.get("name") or "").strip():
        errors.append("Name is required")

    phone = str(payload.get("phone") or "").strip()
    if phone and not PHONE_RE.match(phone):
        errors.append("Invalid phone")

    email = str(payload.get("email") or "").strip()
    if email and not EMAIL_RE.match(email):
        errors.append("Invalid email")

    status = str(payload.get("status") or "on-duty").strip().lower()
    if status not in ALLOWED_STATUS:
        errors.append("Invalid status")

    return errors


def create_personnel(payload: dict):
    errors = _validate_payload(payload)
    if errors:
        raise ValueError("; ".join(errors))

    with get_session() as session:
        pid = str(payload["id"]).strip()
        if session.query(Personnel).filter(Personnel.personnel_id == pid).first():
            raise ValueError(f"Personnel ID '{pid}' already exists")

        row = Personnel(
            personnel_id=pid,
            name=str(payload["name"]).strip(),
            rank=str(payload.get("rank") or "").strip(),
            phone=str(payload.get("phone") or "").strip(),
            email=str(payload.get("email") or "").strip(),
            department=str(payload.get("department") or "").strip(),
            zone=str(payload.get("zone") or "").strip(),
            shift=str(payload.get("shift") or "").strip(),
            status=str(payload.get("status") or "on-duty").strip().lower(),
        )
        session.add(row)
        session.flush()
        return row.to_dict()


def update_personnel(personnel_id: str, payload: dict):
    errors = _validate_payload({**payload, "id": personnel_id}, require_id=False)
    if errors:
        raise ValueError("; ".join(errors))

    with get_session() as session:
        row = session.query(Personnel).filter(Personnel.personnel_id == personnel_id).first()
        if row is None:
            return None

        for field in ("name", "rank", "phone", "email", "department", "zone", "shift"):
            if field in payload and payload[field] is not None:
                setattr(row, field, str(payload[field]).strip())
        if "status" in payload and payload["status"]:
            row.status = str(payload["status"]).strip().lower()

        row.last_activity_at = datetime.now(timezone.utc)
        session.flush()
        return row.to_dict()


def deactivate_personnel(personnel_id: str):
    with get_session() as session:
        row = session.query(Personnel).filter(Personnel.personnel_id == personnel_id).first()
        if row is None:
            return None
        row.status = "inactive"
        session.flush()
        return row.to_dict()


def delete_personnel(personnel_id: str) -> bool:
    with get_session() as session:
        row = session.query(Personnel).filter(Personnel.personnel_id == personnel_id).first()
        if row is None:
            return False
        session.delete(row)
        return True


# ---------------- Excel import ----------------

def _map_columns(header_row):
    header_index = {}
    for idx, cell in enumerate(header_row):
        label = str(cell.value or "").strip().lower()
        for field, aliases in COLUMN_ALIASES.items():
            if label in aliases:
                header_index[field] = idx
                break
    return header_index


def preview_import(file_stream):
    try:
        workbook = openpyxl.load_workbook(file_stream, read_only=True, data_only=True)
    except Exception:
        return {"fileError": "Could not read this file. Please upload a valid .xlsx workbook.", "rows": []}

    sheet = workbook.active
    rows_iter = sheet.iter_rows()
    try:
        header_row = next(rows_iter)
    except StopIteration:
        return {"fileError": "The file is empty.", "rows": []}

    column_map = _map_columns(header_row)
    missing = REQUIRED_COLUMNS - set(column_map.keys())
    if missing:
        return {
            "fileError": f"Missing required column(s): {', '.join(sorted(missing))}",
            "rows": [],
        }

    with get_session() as session:
        existing_ids = {p.personnel_id.lower() for p in session.query(Personnel.personnel_id).all()}

    seen_ids_in_file = set()
    rows = []
    for row_number, cells in enumerate(rows_iter, start=2):
        values = {field: cells[idx].value for field, idx in column_map.items() if idx < len(cells)}
        if not any(v not in (None, "") for v in values.values()):
            continue  # blank row

        data = {
            "id": str(values.get("personnel_id") or "").strip(),
            "name": str(values.get("name") or "").strip(),
            "rank": str(values.get("rank") or "").strip(),
            "phone": str(values.get("phone") or "").strip(),
            "email": str(values.get("email") or "").strip(),
            "department": str(values.get("department") or "").strip(),
            "zone": str(values.get("zone") or "").strip(),
            "shift": str(values.get("shift") or "").strip(),
            "status": str(values.get("status") or "on-duty").strip().lower() or "on-duty",
        }

        errors = _validate_payload(data)
        warnings = []

        if data["id"]:
            key = data["id"].lower()
            if key in seen_ids_in_file:
                errors.append("Duplicate Personnel ID in file")
            seen_ids_in_file.add(key)

        if data["zone"] and data["zone"].upper() not in ZONE_NAMES:
            warnings.append(f"Unknown zone '{data['zone']}' — will be saved as-is")

        action = "update" if data["id"].lower() in existing_ids else "create"

        rows.append({
            "rowNumber": row_number,
            "data": data,
            "errors": errors,
            "warnings": warnings,
            "action": action,
        })

    return {"fileError": None, "rows": rows}


def confirm_import(rows: list[dict], actor: str):
    imported = updated = failed = 0
    with get_session() as session:
        existing = {
            p.personnel_id.lower(): p
            for p in session.query(Personnel).all()
        }

        for entry in rows:
            data = entry.get("data") or {}
            errors = _validate_payload(data)
            if errors:
                failed += 1
                continue

            pid_key = str(data["id"]).strip().lower()
            row = existing.get(pid_key)
            is_new = row is None
            try:
                with session.begin_nested():  # SAVEPOINT: one bad row can't roll back the rest of the batch
                    if is_new:
                        row = Personnel(personnel_id=str(data["id"]).strip())
                        session.add(row)

                    row.name = str(data["name"]).strip()
                    row.rank = str(data.get("rank") or "").strip()
                    row.phone = str(data.get("phone") or "").strip()
                    row.email = str(data.get("email") or "").strip()
                    row.department = str(data.get("department") or "").strip()
                    row.zone = str(data.get("zone") or "").strip()
                    row.shift = str(data.get("shift") or "").strip()
                    row.status = str(data.get("status") or "on-duty").strip().lower()
                    row.last_activity_at = datetime.now(timezone.utc)
                    session.flush()

                existing[pid_key] = row
                imported += 1 if is_new else 0
                updated += 0 if is_new else 1
            except Exception:
                failed += 1

    return {
        "total": len(rows),
        "imported": imported,
        "updated": updated,
        "skipped": 0,
        "failed": failed,
    }
