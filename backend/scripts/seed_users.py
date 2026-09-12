"""
Creates the three demo accounts referenced on the login page. Idempotent -
safe to run multiple times (upserts by email).

Usage (from backend/, with DATABASE_URL set and migrations applied):
    python -m scripts.seed_users
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.constants.enums import UserRole
from app.core.security import hash_password
from app.database.session import get_engine
from app.models.user import User
from sqlalchemy.orm import Session

# Documented demo password for every seeded account - never used outside the
# hackathon demo environment.
DEMO_PASSWORD = "Demo@1234"

DEMO_USERS = [
    ("Admin User", "admin@example.com", UserRole.ADMIN),
    ("Generator User", "generator@example.com", UserRole.WASTE_GENERATOR),
    ("Facility Operator", "facility@example.com", UserRole.FACILITY_OPERATOR),
]


def main() -> None:
    engine = get_engine()
    with Session(engine) as db:
        for name, email, role in DEMO_USERS:
            existing = db.scalar(select(User).where(User.email == email))
            if existing:
                print(f"skip (exists): {email}")
                continue
            db.add(User(name=name, email=email, hashed_password=hash_password(DEMO_PASSWORD), role=role))
            print(f"created: {email} / {role.value}")
        db.commit()
    print(f"\nDemo password for all accounts: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
