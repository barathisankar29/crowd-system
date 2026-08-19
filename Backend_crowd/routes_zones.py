from flask import Blueprint, jsonify

import pipeline
from config import ZONE_NAMES
from db import get_session
from models import Personnel

zones_bp = Blueprint("zones", __name__)


@zones_bp.route("/api/zones")
def api_zones():
    with pipeline.data_lock:
        zone_counts = dict(pipeline.global_data.get("zones", {}))

    capacities = pipeline.get_zone_capacity_map()

    with get_session() as session:
        officer_rows = (
            session.query(Personnel.zone, Personnel.id)
            .filter(Personnel.status != "off-duty", Personnel.status != "inactive")
            .all()
        )
    officer_counts: dict[str, int] = {}
    for zone, _id in officer_rows:
        officer_counts[zone] = officer_counts.get(zone, 0) + 1

    zones = []
    for zone_name in ZONE_NAMES:
        current = int(zone_counts.get(zone_name, 0))
        capacity = int(capacities.get(zone_name, 5))
        density = int((current / capacity) * 100) if capacity > 0 else 0
        status = "critical" if density >= 80 else ("medium" if density >= 50 else "low")

        zones.append({
            "zone": f"Zone {zone_name}",
            "capacity": capacity,
            "current": current,
            "density": density,
            "status": status,
            "officers": officer_counts.get(f"Zone {zone_name}", 0) + officer_counts.get(zone_name, 0),
        })

    return jsonify(zones)
