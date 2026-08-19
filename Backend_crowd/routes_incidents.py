from flask import Blueprint, jsonify, request

import services_incidents
from auth import require_permission

incidents_bp = Blueprint("incidents", __name__)


def _actor():
    return request.headers.get("X-User-Name", "Control")


@incidents_bp.route("/api/incidents")
def list_incidents():
    return jsonify(services_incidents.list_incidents(
        severity=request.args.get("severity"),
        status=request.args.get("status"),
        zone=request.args.get("zone"),
        q=request.args.get("q"),
    ))


@incidents_bp.route("/api/incidents/<incident_id>")
def get_incident(incident_id):
    row = services_incidents.get_incident(incident_id)
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(row)


@incidents_bp.route("/api/incidents/<incident_id>", methods=["PATCH"])
@require_permission("manage_incidents")
def update_incident(incident_id):
    payload = request.get_json(silent=True) or {}
    row = services_incidents.update_incident(incident_id, payload.get("status"), _actor())
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(row)


@incidents_bp.route("/api/incidents/<incident_id>/assign", methods=["PATCH"])
@require_permission("manage_incidents")
def assign_incident(incident_id):
    payload = request.get_json(silent=True) or {}
    try:
        row = services_incidents.assign_personnel(incident_id, payload.get("personnelId"), _actor())
    except ValueError as exc:
        return jsonify({"error": "validation", "message": str(exc)}), 400
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(row)


@incidents_bp.route("/api/incidents/<incident_id>/notes", methods=["POST"])
@require_permission("manage_incidents")
def add_note(incident_id):
    payload = request.get_json(silent=True) or {}
    try:
        row = services_incidents.add_note(incident_id, payload.get("author") or _actor(), payload.get("note"))
    except ValueError as exc:
        return jsonify({"error": "validation", "message": str(exc)}), 400
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(row)
