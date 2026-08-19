from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import config
from models import Base, Permission, Role, RolePermission

connect_args = {"check_same_thread": False} if config.DB_URL.startswith("sqlite") else {}
engine = create_engine(config.DB_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


ROLES = [
    ("admin", "Admin"),
    ("security_officer", "Security Officer"),
    ("authority", "Authority"),
]

PERMISSIONS = [
    ("view_dashboard", "View Dashboard"),
    ("view_live_feed", "View Live Feed"),
    ("view_incidents", "View Incidents"),
    ("manage_incidents", "Manage Incidents"),
    ("manage_security_team", "Manage Security Team"),
    ("import_personnel", "Import Personnel"),
    ("dispatch", "Dispatch"),
    ("manage_authorities", "Manage Authorities"),
    ("view_reports", "View Reports"),
    ("manage_system_settings", "Manage System Settings"),
]

DEFAULT_ROLE_PERMISSIONS = {
    "admin": {key for key, _ in PERMISSIONS},
    "security_officer": {
        "view_dashboard", "view_live_feed", "view_incidents", "manage_incidents",
        "manage_security_team", "import_personnel", "dispatch", "view_reports",
    },
    "authority": {"view_dashboard", "view_live_feed", "view_incidents", "view_reports"},
}


def init_db():
    Base.metadata.create_all(engine)
    with get_session() as session:
        if session.query(Role).count() > 0:
            return

        role_rows = {key: Role(key=key, label=label) for key, label in ROLES}
        permission_rows = {key: Permission(key=key, label=label) for key, label in PERMISSIONS}
        session.add_all(role_rows.values())
        session.add_all(permission_rows.values())
        session.flush()

        for role_key, permission_keys in DEFAULT_ROLE_PERMISSIONS.items():
            for permission_key in permission_keys:
                session.add(RolePermission(
                    role_id=role_rows[role_key].id,
                    permission_id=permission_rows[permission_key].id,
                ))
