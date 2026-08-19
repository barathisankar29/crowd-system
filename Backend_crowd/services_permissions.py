from db import get_session
from models import Permission, Role, RolePermission


def list_roles():
    with get_session() as session:
        return [r.to_dict() for r in session.query(Role).order_by(Role.id).all()]


def list_permissions():
    with get_session() as session:
        return [p.to_dict() for p in session.query(Permission).order_by(Permission.id).all()]


def get_matrix():
    with get_session() as session:
        roles = session.query(Role).order_by(Role.id).all()
        permissions = session.query(Permission).order_by(Permission.id).all()
        granted = {
            (rp.role_id, rp.permission_id)
            for rp in session.query(RolePermission).all()
        }

        return {
            "roles": [r.to_dict() for r in roles],
            "permissions": [p.to_dict() for p in permissions],
            "matrix": {
                role.key: [p.key for p in permissions if (role.id, p.id) in granted]
                for role in roles
            },
        }


def set_role_permission(role_key: str, permission_key: str, enabled: bool):
    with get_session() as session:
        role = session.query(Role).filter(Role.key == role_key).first()
        permission = session.query(Permission).filter(Permission.key == permission_key).first()
        if role is None or permission is None:
            raise ValueError("Unknown role or permission")

        existing = (
            session.query(RolePermission)
            .filter(RolePermission.role_id == role.id, RolePermission.permission_id == permission.id)
            .first()
        )

        if enabled and existing is None:
            session.add(RolePermission(role_id=role.id, permission_id=permission.id))
        elif not enabled and existing is not None:
            session.delete(existing)

    return get_matrix()
