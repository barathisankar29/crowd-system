from flask import Blueprint, jsonify, request

import services_personnel
from auth import require_permission

personnel_bp = Blueprint("personnel", __name__)


def _actor():
    return request.headers.get("X-User-Name", "Control")


@personnel_bp.route("/api/personnel")
def list_personnel():
    return jsonify(services_personnel.list_personnel(
        status=request.args.get("status"), zone=request.args.get("zone"),
    ))


@personnel_bp.route("/api/personnel/<personnel_id>")
def get_personnel(personnel_id):
    row = services_personnel.get_personnel(personnel_id)
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(row)


@personnel_bp.route("/api/personnel", methods=["POST"])
@require_permission("manage_security_team")
def create_personnel():
    payload = request.get_json(silent=True) or {}
    try:
        row = services_personnel.create_personnel(payload)
    except ValueError as exc:
        return jsonify({"error": "validation", "message": str(exc)}), 400
    return jsonify(row), 201


@personnel_bp.route("/api/personnel/<personnel_id>", methods=["PATCH"])
@require_permission("manage_security_team")
def update_personnel(personnel_id):
    payload = request.get_json(silent=True) or {}
    try:
        row = services_personnel.update_personnel(personnel_id, payload)
    except ValueError as exc:
        return jsonify({"error": "validation", "message": str(exc)}), 400
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(row)


@personnel_bp.route("/api/personnel/<personnel_id>", methods=["DELETE"])
@require_permission("manage_security_team")
def deactivate_personnel(personnel_id):
    hard = request.args.get("hard") == "true"
    if hard:
        deleted = services_personnel.delete_personnel(personnel_id)
        if not deleted:
            return jsonify({"error": "not_found"}), 404
        return jsonify({"success": True})

    row = services_personnel.deactivate_personnel(personnel_id)
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(row)


@personnel_bp.route("/api/personnel/import/preview", methods=["POST"])
@require_permission("import_personnel")
def import_preview():
    file = request.files.get("file")
    if file is None:
        return jsonify({"fileError": "No file uploaded", "rows": []}), 400
    return jsonify(services_personnel.preview_import(file.stream))


@personnel_bp.route("/api/personnel/import/confirm", methods=["POST"])
@require_permission("import_personnel")
def import_confirm():
    payload = request.get_json(silent=True) or {}
    rows = payload.get("rows") or []
    return jsonify(services_personnel.confirm_import(rows, _actor()))
