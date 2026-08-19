from flask import Blueprint, jsonify, request

import services_permissions
from auth import require_permission

permissions_bp = Blueprint("permissions", __name__)


@permissions_bp.route("/api/roles")
def list_roles():
    return jsonify(services_permissions.list_roles())


@permissions_bp.route("/api/permissions")
def list_permissions():
    return jsonify(services_permissions.list_permissions())


@permissions_bp.route("/api/role-permissions")
def get_matrix():
    return jsonify(services_permissions.get_matrix())


@permissions_bp.route("/api/role-permissions", methods=["PATCH"])
@require_permission("manage_authorities")
def set_matrix_cell():
    payload = request.get_json(silent=True) or {}
    role_key, permission_key, enabled = payload.get("role"), payload.get("permission"), bool(payload.get("enabled"))
    try:
        matrix = services_permissions.set_role_permission(role_key, permission_key, enabled)
    except ValueError as exc:
        return jsonify({"error": "validation", "message": str(exc)}), 400
    return jsonify(matrix)
