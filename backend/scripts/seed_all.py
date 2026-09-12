"""
Unified database seeding script for HackOut'26.
Checks if the database is empty before seeding.
Can also be run directly:
    python -m scripts.seed_all
Or with force:
    python -m scripts.seed_all --force
"""
import random
import sys
from datetime import date
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants.enums import FacilityStatus, FacilityType, GeneratorType, RouteStatus, UserRole, WasteStatus, WasteType
from app.core.security import hash_password
from app.database.geo import point_from_lat_lng
from app.database.session import get_engine
from app.models.carbon_record import CarbonRecord
from app.models.facility import Facility
from app.models.route import Route
from app.models.route_stop import RouteStop
from app.models.user import User
from app.models.waste_generator import WasteGenerator
from app.models.waste_record import WasteRecord
from scripts.seed_demo_data import (
    DEMO_YEAR,
    DISTRICT_CENTRES,
    FACILITIES,
    GENERATORS,
    days_in_month,
    jitter,
)

DEMO_PASSWORD = "Demo@1234"

# 1 Admin, 2 Waste Generators, 2 Facility Operators
DEMO_USERS = [
    {
        "name": "Platform Administrator",
        "email": "admin@example.com",
        "role": UserRole.ADMIN,
        "linked_entity": None,
    },
    {
        "name": "Rameshbhai Patel (Anand Dairy)",
        "email": "generator1@example.com",
        "role": UserRole.WASTE_GENERATOR,
        "linked_entity": "Zakariyapura Dairy Cooperative",
    },
    {
        "name": "Jayeshbhai Solanki (Kheda Crop Farms)",
        "email": "generator2@example.com",
        "role": UserRole.WASTE_GENERATOR,
        "linked_entity": "Charotar Paddy Farms",
    },
    {
        "name": "Anand BioGas Plant Manager",
        "email": "facility1@example.com",
        "role": UserRole.FACILITY_OPERATOR,
        "linked_entity": "Anand BioGas Cooperative Plant",
    },
    {
        "name": "Kheda BioCarbon Operations Lead",
        "email": "facility2@example.com",
        "role": UserRole.FACILITY_OPERATOR,
        "linked_entity": "Kheda BioCarbon Facility A",
    },
]


def is_database_empty(db: Session) -> bool:
    """Checks if the core tables are empty."""
    user_count = db.scalar(select(func.count(User.id))) or 0
    generator_count = db.scalar(select(func.count(WasteGenerator.id))) or 0
    facility_count = db.scalar(select(func.count(Facility.id))) or 0
    return user_count == 0 and generator_count == 0 and facility_count == 0


def seed_database(db: Session, force: bool = False) -> dict:
    """Seeds the full dataset if empty or force=True."""
    if not force and not is_database_empty(db):
        print("Database is already populated. Skipping automatic seeding.")
        return {"status": "skipped", "reason": "database not empty"}

    print("Seeding database with Demo Users, Waste Generators, Facilities, Waste Records, Routes, and Carbon Accounting...")

    # 1. Seed Users (1 Admin, 2 Generators, 2 Facility Operators)
    created_users = 0
    user_map: dict[str, User] = {}
    for u in DEMO_USERS:
        existing = db.scalar(select(User).where(User.email == u["email"]))
        if existing:
            existing.name = u["name"]
            existing.role = u["role"]
            existing.hashed_password = hash_password(DEMO_PASSWORD)
            user_map[u["email"]] = existing
        else:
            user = User(
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(DEMO_PASSWORD),
                role=u["role"],
            )
            db.add(user)
            user_map[u["email"]] = user
            created_users += 1
    db.flush()

    # 2. Seed Facilities
    facility_map: dict[str, Facility] = {}
    for spec in FACILITIES:
        existing_facility = db.scalar(select(Facility).where(Facility.name == spec["name"]))
        centre_lat, centre_lng = DISTRICT_CENTRES[spec["district"]]
        lat, lng = jitter(centre_lat, centre_lng, km=4.0)

        if not existing_facility:
            facility = Facility(
                name=spec["name"],
                facility_type=spec["facility_type"],
                capacity_tonnes=spec["capacity_tonnes"],
                current_load_tonnes=spec["current_load_tonnes"],
                accepted_waste_types=spec["accepted_waste_types"],
                address=spec["address"],
                location=point_from_lat_lng(lat, lng),
                status=FacilityStatus.ACTIVE,
            )
            db.add(facility)
            db.flush()
            facility_map[spec["name"]] = facility
        else:
            facility_map[spec["name"]] = existing_facility

    # 3. Seed Waste Generators & Records
    generator_map: dict[str, WasteGenerator] = {}
    total_waste_records = 0

    for spec in GENERATORS:
        existing_gen = db.scalar(select(WasteGenerator).where(WasteGenerator.name == spec.name))
        centre_lat, centre_lng = DISTRICT_CENTRES[spec.district]
        lat, lng = jitter(centre_lat, centre_lng)

        email = None
        if spec.name == "Zakariyapura Dairy Cooperative":
            email = "generator1@example.com"
        elif spec.name == "Charotar Paddy Farms":
            email = "generator2@example.com"

        owner = user_map.get(email) if email else None

        if not existing_gen:
            gen = WasteGenerator(
                name=spec.name,
                generator_type=spec.generator_type,
                contact_name=spec.contact_name,
                phone=spec.phone,
                email=email,
                # Links this demo generator to its demo login (see
                # WasteGenerator.user_id) so /api/generators/mine, the
                # Network Map, and Smart Matching's waste-record picker all
                # recognize it as this account's own instead of treating it
                # as unowned.
                user_id=owner.id if owner else None,
                address=f"{spec.district} District, Gujarat",
                location=point_from_lat_lng(lat, lng),
            )
            db.add(gen)
            db.flush()
            generator_map[spec.name] = gen
        else:
            if email and not existing_gen.email:
                existing_gen.email = email
            # Backfill ownership for rows seeded before user_id existed -
            # without this, a demo account that predates the migration
            # would permanently own nothing despite having a matching email.
            if owner and existing_gen.user_id is None:
                existing_gen.user_id = owner.id
            generator_map[spec.name] = existing_gen
            gen = existing_gen

        # Generate waste records if none exist for this generator
        existing_records_count = db.scalar(select(func.count(WasteRecord.id)).where(WasteRecord.generator_id == gen.id))
        if existing_records_count == 0:
            for waste_type, monthly_tonnes, months in spec.waste_profile:
                active_months = months if months is not None else list(range(1, 13))
                for month in active_months:
                    quantity = round(monthly_tonnes * random.uniform(0.9, 1.1), 1)
                    available_from = date(DEMO_YEAR, month, 1)
                    available_until = date(DEMO_YEAR, month, days_in_month(DEMO_YEAR, month))
                    
                    status = WasteStatus.AVAILABLE
                    if month in [10, 11, 12]:
                        status = random.choice([WasteStatus.AVAILABLE, WasteStatus.COLLECTED, WasteStatus.PROCESSED])

                    db.add(
                        WasteRecord(
                            generator_id=gen.id,
                            waste_type=waste_type,
                            quantity_tonnes=quantity,
                            moisture_percent=round(random.uniform(10, 20), 1),
                            available_from=available_from,
                            available_until=available_until,
                            status=status,
                        )
                    )
                    total_waste_records += 1

    db.flush()

    # 4. Seed a demo route and carbon records if empty
    routes_count = db.scalar(select(func.count(Route.id))) or 0
    if routes_count == 0 and "Anand BioGas Cooperative Plant" in facility_map:
        anand_facility = facility_map["Anand BioGas Cooperative Plant"]
        route = Route(
            facility_id=anand_facility.id,
            vehicle_capacity_tonnes=10.0,
            total_distance_km=28.4,
            estimated_transport_cost=426.0,
            total_waste_tonnes=8.5,
            status=RouteStatus.IN_PROGRESS,
        )
        db.add(route)
        db.flush()

        if "Zakariyapura Dairy Cooperative" in generator_map:
            zak_gen = generator_map["Zakariyapura Dairy Cooperative"]
            zak_waste = db.scalar(
                select(WasteRecord).where(WasteRecord.generator_id == zak_gen.id).limit(1)
            )
            if zak_waste:
                db.add(
                    RouteStop(
                        route_id=route.id,
                        waste_record_id=zak_waste.id,
                        stop_order=1,
                        quantity_tonnes=8.5,
                    )
                )

    # 5. Seed Carbon Records
    carbon_count = db.scalar(select(func.count(CarbonRecord.id))) or 0
    if carbon_count == 0 and "Anand BioGas Cooperative Plant" in facility_map and "Zakariyapura Dairy Cooperative" in generator_map:
        anand_facility = facility_map["Anand BioGas Cooperative Plant"]
        zak_gen = generator_map["Zakariyapura Dairy Cooperative"]
        
        # Pick one collected/processed waste record
        sample_record = db.scalar(
            select(WasteRecord).where(WasteRecord.generator_id == zak_gen.id).limit(1)
        )
        if sample_record:
            db.add(
                CarbonRecord(
                    waste_record_id=sample_record.id,
                    facility_id=anand_facility.id,
                    waste_quantity_tonnes=float(sample_record.quantity_tonnes),
                    conversion_type=FacilityType.BIOGAS,
                    conversion_output_tonnes=round(float(sample_record.quantity_tonnes) * 0.35, 2),
                    carbon_content_percent=55.0,
                    estimated_sequestered_co2_tonnes=round(float(sample_record.quantity_tonnes) * 0.85, 2),
                    transport_emissions_tonnes=0.08,
                    net_co2_impact_tonnes=round(float(sample_record.quantity_tonnes) * 0.85 - 0.08, 2),
                    methodology_note="IPCC Tier 2 Anaerobic Digestion + Gujarat Dairy manure baseline",
                )
            )

    db.commit()
    print("Database seeding completed successfully!")
    return {
        "status": "seeded",
        "users": len(DEMO_USERS),
        "generators": len(GENERATORS),
        "facilities": len(FACILITIES),
        "waste_records": total_waste_records,
    }


def auto_seed_if_empty():
    """Helper called during FastAPI startup."""
    try:
        engine = get_engine()
        with Session(engine) as db:
            if is_database_empty(db):
                print("[Auto-Seed] Database is empty. Running automatic seed...")
                seed_database(db)
            else:
                print("[Auto-Seed] Database contains data. Skipping auto-seed.")
    except Exception as exc:
        print(f"[Auto-Seed] Note: Database not ready or unreachable on boot ({exc}). Skipping auto-seed.")


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    engine = get_engine()
    with Session(engine) as session:
        seed_database(session, force=force_flag)
