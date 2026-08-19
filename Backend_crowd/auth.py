"""
Lightweight, password-free identity: the frontend lets an operator pick a
name + role once (no credentials) and sends that role on every request as
X-User-Role. This is NOT a secure login — there is no verified session, and
anyone can send any header. It exists so the permission model is real and
enforced on the backend (not just hidden in the UI), and so that swapping in
a real authenticated session later only means replacing how the role is
resolved here, not rewriting every route or the frontend's calling code.
"""
from functools import wraps

from flask import jsonify, request

from db import get_session
from models import Permission, Role, RolePermission


def role_has_permission(role_key: str, permission_key: str) -> bool:
    if not role_key:
        return False

    with get_session() as session:
        match = (
            session.query(RolePermission)
            .join(Role, Role.id == RolePermission.role_id)
            .join(Permission, Permission.id == RolePermission.permission_id)
            .filter(Role.key == role_key, Permission.key == permission_key)
            .first()
        )
        return match is not None


def require_permission(permission_key: str):
    def decorator(view_fn):
        @wraps(view_fn)
        def wrapped(*args, **kwargs):
            role_key = request.headers.get("X-User-Role", "")
            if not role_has_permission(role_key, permission_key):
                return jsonify({
                    "error": "forbidden",
                    "message": f"Role '{role_key or '(none)'}' lacks permission '{permission_key}'",
                }), 403
            return view_fn(*args, **kwargs)

        return wrapped

    return decorator
