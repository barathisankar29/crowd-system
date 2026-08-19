from flask import Blueprint, jsonify, request

import services_dispatch
from auth import require_permission

dispatch_bp = Blueprint("dispatch", __name__)


@dispatch_bp.route("/api/dispatch")
def list_dispatch():
    return jsonify(services_dispatch.list_dispatch(request.args.get("incidentId")))


@dispatch_bp.route("/api/dispatch", methods=["POST"])
@require_permission("dispatch")
def create_dispatch():
    payload = request.get_json(silent=True) or {}
    actor = request.headers.get("X-User-Name", "Control")
    try:
        row = services_dispatch.create_dispatch(payload, actor)
    except ValueError as exc:
        return jsonify({"error": "validation", "message": str(exc)}), 400
    return jsonify(row), 201
