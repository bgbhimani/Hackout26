"""
Seeds waste generators, facilities, and waste records for the Gujarat demo
scenario documented in full in data/ml-data-research.md. Every quantity
constant below is calibrated against a real, cited figure from that document
- this script is the code-level half of that research; read it alongside
data/ml-data-research.md, not instead of it.

This script is destructive-and-idempotent: it deletes any previously seeded
demo generators/facilities/waste records (matched by name) and reinserts
fresh, so it's safe to re-run after a schema change without accumulating
duplicates. It does NOT touch the `users` table (see scripts/seed_users.py).

Usage (from backend/, with DATABASE_URL set and migrations applied):
    python -m scripts.seed_demo_data
"""
import random
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.enums import FacilityStatus, FacilityType, GeneratorType, WasteStatus, WasteType
from app.database.geo import point_from_lat_lng
from app.database.session import get_engine
from app.models.facility import Facility
from app.models.user import User
from app.models.waste_generator import WasteGenerator
from app.models.waste_record import WasteRecord

random.seed(42)  # reproducible demo data across reseeds

# ─────────────────────────────────────────────────────────────────────────
# Real-world calibration constants. Each one is cited in data/ml-data-research.md.
# ─────────────────────────────────────────────────────────────────────────

# Approximate town-centre coordinates for the five demo districts (WGS84).
# Individual generator coordinates are these +/- a small random offset -
# real district, approximate exact site, exactly as disclosed in the UI's
# "Demo / Synthetic Data" badge.
DISTRICT_CENTRES = {
    "Anand": (22.5645, 72.9289),
    "Mehsana": (23.5880, 72.3693),
    "Kheda": (22.7507, 72.6847),
    "Ahmedabad": (23.0225, 72.5714),
    "Gandhinagar": (23.2156, 72.6369),
}

# Gujarat dairy-cooperative manure yield: ~35,000 t/day dung from ~25 lakh
# (2.5M) dairy animals statewide => ~14 kg/animal/day (NDDB/dairy-cooperative
# studies, 2021-22 - see ml-data-research.md section 3).
MANURE_KG_PER_ANIMAL_PER_DAY = 14.0

# Residue-to-Product Ratios (see app/constants/carbon_factors.py, same source).
RPR = {
    WasteType.RICE_STRAW: 1.5,
    WasteType.WHEAT_STRAW: 1.5,
    WasteType.COTTON_RESIDUE: 2.75,
}

# Gujarat crop calendar: month each residue becomes available for collection
# (harvest month(s) - see ml-data-research.md section 4).
HARVEST_MONTHS = {
    WasteType.RICE_STRAW: [10, 11],
    WasteType.COTTON_RESIDUE: [10, 11, 12, 1],
    WasteType.WHEAT_STRAW: [3, 4],
}

# CPCB per-capita municipal solid waste rate for a mid-size Gujarat town -
# national average is 123.45 gm/day (2021-22 Annual Report); we use the
# higher end of CPCB's stated range for larger towns (~0.4 kg/day) since
# Gandhinagar/Ahmedabad zones are denser than the national average.
MSW_KG_PER_CAPITA_PER_DAY = 0.4

DEMO_YEAR = 2025


def days_in_month(year: int, month: int) -> int:
    import calendar

    return calendar.monthrange(year, month)[1]


def jitter(lat: float, lng: float, km: float = 8.0) -> tuple[float, float]:
    """Randomly offsets a district-centre coordinate by up to ~`km`
    kilometres, so generators plotted on the map don't all stack on one
    pin. 1 degree of latitude is ~111km; longitude is scaled by cos(lat)."""
    import math

    max_deg_lat = km / 111.0
    max_deg_lng = km / (111.0 * math.cos(math.radians(lat)))
    return (lat + random.uniform(-max_deg_lat, max_deg_lat), lng + random.uniform(-max_deg_lng, max_deg_lng))


@dataclass
class GeneratorSpec:
    name: str
    generator_type: GeneratorType
    district: str
    contact_name: str
    phone: str
    # (waste_type, monthly_tonnes, [available months] or None for "every month")
    waste_profile: list[tuple[WasteType, float, list[int] | None]] = field(default_factory=list)


def dairy_generator(name: str, district: str, animal_count: int, contact: str, phone: str) -> GeneratorSpec:
    """A dairy-cooperative-society generator (Anand/Mehsana archetype).
    Monthly manure tonnage derived from real per-animal yield - see
    MANURE_KG_PER_ANIMAL_PER_DAY above."""
    monthly_tonnes = round((animal_count * MANURE_KG_PER_ANIMAL_PER_DAY * 30) / 1000, 1)
    return GeneratorSpec(
        name=name,
        generator_type=GeneratorType.FARM,
        district=district,
        contact_name=contact,
        phone=phone,
        waste_profile=[(WasteType.ANIMAL_MANURE, monthly_tonnes, None)],  # continuous, no seasonality
    )


def crop_generator(
    name: str, district: str, crop_production_tonnes: float, waste_type: WasteType, contact: str, phone: str
) -> GeneratorSpec:
    """A farm generator whose residue tonnage is `crop_production_tonnes *
    RPR[waste_type]` - i.e. derived from a real conversion factor, not
    invented directly. Available only in the crop's real harvest months."""
    residue_tonnes = round(crop_production_tonnes * RPR[waste_type], 1)
    return GeneratorSpec(
        name=name,
        generator_type=GeneratorType.FARM,
        district=district,
        contact_name=contact,
        phone=phone,
        waste_profile=[(waste_type, residue_tonnes, HARVEST_MONTHS[waste_type])],
    )


def municipal_generator(name: str, district: str, population_served: int, contact: str, phone: str) -> GeneratorSpec:
    """A municipal collection-zone generator, sized from CPCB's published
    per-capita MSW rate against a realistic served population (a zone, not
    the whole city)."""
    monthly_tonnes = round((population_served * MSW_KG_PER_CAPITA_PER_DAY * 30) / 1000, 1)
    return GeneratorSpec(
        name=name,
        generator_type=GeneratorType.MUNICIPALITY,
        district=district,
        contact_name=contact,
        phone=phone,
        waste_profile=[(WasteType.ORGANIC_WASTE, monthly_tonnes, None)],
    )


def food_industry_generator(name: str, district: str, monthly_tonnes: float, contact: str, phone: str) -> GeneratorSpec:
    return GeneratorSpec(
        name=name,
        generator_type=GeneratorType.FOOD_INDUSTRY,
        district=district,
        contact_name=contact,
        phone=phone,
        waste_profile=[(WasteType.FOOD_WASTE, monthly_tonnes, None)],
    )


# ─────────────────────────────────────────────────────────────────────────
# The 16 demo generators. Animal counts / crop tonnages are realistic
# village/farm-cooperative-scale figures for these districts, not the full
# district totals (which run into hundreds of thousands of tonnes/animals).
# ─────────────────────────────────────────────────────────────────────────
GENERATORS: list[GeneratorSpec] = [
    # Anand - dairy cooperative societies (Amul's home district)
    dairy_generator("Zakariyapura Dairy Cooperative", "Anand", 320, "Rameshbhai Patel", "9825010001"),
    dairy_generator("Vaso Milk Producers Society", "Anand", 260, "Kiranben Desai", "9825010002"),
    dairy_generator("Borsad Dairy Cooperative", "Anand", 410, "Ashokbhai Chaudhary", "9825010003"),
    # Mehsana - Dudhsagar Dairy cooperative belt
    dairy_generator("Kadi Milk Producers Cooperative", "Mehsana", 280, "Bhavesh Thakor", "9825020001"),
    dairy_generator("Visnagar Dairy Society", "Mehsana", 340, "Nayanaben Rana", "9825020002"),
    # Kheda - Charotar crop-residue belt
    crop_generator("Charotar Paddy Farms", "Kheda", 180, WasteType.RICE_STRAW, "Jayeshbhai Solanki", "9825030001"),
    crop_generator("Nadiad Cotton Growers Group", "Kheda", 140, WasteType.COTTON_RESIDUE, "Mahesh Vaghela", "9825030002"),
    crop_generator("Kapadvanj Wheat Farms", "Kheda", 160, WasteType.WHEAT_STRAW, "Sureshbhai Baria", "9825030003"),
    crop_generator("Mahisagar Paddy Cooperative", "Kheda", 150, WasteType.RICE_STRAW, "Dineshbhai Parmar", "9825030004"),
    # Ahmedabad - urban food-processing/industrial waste
    food_industry_generator("Naroda Food Processing Unit", "Ahmedabad", 45.0, "Anilkumar Shah", "9825040001"),
    food_industry_generator("Vatva Agro Processing Plant", "Ahmedabad", 38.5, "Priya Mehta", "9825040002"),
    food_industry_generator("Bapunagar Cold Storage & Packaging", "Ahmedabad", 22.0, "Rajesh Trivedi", "9825040003"),
    # Ahmedabad - municipal zones
    municipal_generator("Ahmedabad Municipal Zone - Maninagar", "Ahmedabad", 8000, "AMC Ward Office", "9825040010"),
    municipal_generator("Ahmedabad Municipal Zone - Vastrapur", "Ahmedabad", 6500, "AMC Ward Office", "9825040011"),
    # Gandhinagar - municipal
    municipal_generator("Gandhinagar Municipal Zone - Sector 21", "Gandhinagar", 5000, "GMC Ward Office", "9825050001"),
    municipal_generator("Gandhinagar Municipal Zone - Sector 7", "Gandhinagar", 4200, "GMC Ward Office", "9825050002"),
]

# ─────────────────────────────────────────────────────────────────────────
# Facilities: sited near the waste type they accept, capacity sized against
# the real Mehsana 500 m3 / 200-buffalo biogas plant case study as an anchor
# for what a "real-scale" facility here looks like.
# ─────────────────────────────────────────────────────────────────────────
FACILITIES: list[dict] = [
    dict(
        name="Anand BioGas Cooperative Plant",
        facility_type=FacilityType.BIOGAS,
        capacity_tonnes=180.0,
        current_load_tonnes=95.0,
        accepted_waste_types=[WasteType.ANIMAL_MANURE, WasteType.FOOD_WASTE, WasteType.ORGANIC_WASTE],
        district="Anand",
        address="GIDC Estate, Anand, Gujarat",
    ),
    dict(
        name="Mehsana Dairy Biogas Unit",
        facility_type=FacilityType.BIOGAS,
        capacity_tonnes=150.0,
        current_load_tonnes=70.0,
        accepted_waste_types=[WasteType.ANIMAL_MANURE, WasteType.ORGANIC_WASTE],
        district="Mehsana",
        address="Dudhsagar Dairy Road, Mehsana, Gujarat",
    ),
    dict(
        name="Kheda BioCarbon Facility A",
        facility_type=FacilityType.BIOCHAR,
        capacity_tonnes=220.0,
        current_load_tonnes=130.0,
        accepted_waste_types=[WasteType.RICE_STRAW, WasteType.WHEAT_STRAW, WasteType.COTTON_RESIDUE],
        district="Kheda",
        address="Nadiad-Kapadvanj Highway, Kheda, Gujarat",
    ),
    dict(
        name="Charotar Biomass Conversion Plant",
        facility_type=FacilityType.BIOMASS_CONVERSION,
        capacity_tonnes=260.0,
        current_load_tonnes=140.0,
        accepted_waste_types=[WasteType.RICE_STRAW, WasteType.COTTON_RESIDUE, WasteType.SUGARCANE_RESIDUE],
        district="Kheda",
        address="Anand-Kheda Road, Kheda, Gujarat",
    ),
    dict(
        name="Ahmedabad Urban BioGas Facility",
        facility_type=FacilityType.BIOGAS,
        capacity_tonnes=200.0,
        current_load_tonnes=160.0,
        accepted_waste_types=[WasteType.FOOD_WASTE, WasteType.ORGANIC_WASTE],
        district="Ahmedabad",
        address="Pirana Road, Ahmedabad, Gujarat",
    ),
    dict(
        name="Vatva Industrial Biomass Unit",
        facility_type=FacilityType.BIOMASS_CONVERSION,
        capacity_tonnes=140.0,
        current_load_tonnes=55.0,
        accepted_waste_types=[WasteType.ORGANIC_WASTE, WasteType.FOOD_WASTE],
        district="Ahmedabad",
        address="Vatva GIDC, Ahmedabad, Gujarat",
    ),
    dict(
        name="Gandhinagar Municipal BioCarbon Unit",
        facility_type=FacilityType.BIOCHAR,
        capacity_tonnes=90.0,
        current_load_tonnes=30.0,
        accepted_waste_types=[WasteType.ORGANIC_WASTE],
        district="Gandhinagar",
        address="Sector 28 Industrial Area, Gandhinagar, Gujarat",
    ),
]


def clear_demo_data(db: Session) -> None:
    """Delete previously-seeded demo rows by name, so re-running this script
    doesn't accumulate duplicates. Cascades remove waste_records/matches/etc."""
    names = [g.name for g in GENERATORS]
    existing = db.scalars(select(WasteGenerator).where(WasteGenerator.name.in_(names))).all()
    for g in existing:
        db.delete(g)

    facility_names = [f["name"] for f in FACILITIES]
    existing_facilities = db.scalars(select(Facility).where(Facility.name.in_(facility_names))).all()
    for f in existing_facilities:
        db.delete(f)

    db.commit()


def seed_generators_and_waste(db: Session) -> int:
    record_count = 0
    for spec in GENERATORS:
        centre_lat, centre_lng = DISTRICT_CENTRES[spec.district]
        lat, lng = jitter(centre_lat, centre_lng)

        generator = WasteGenerator(
            name=spec.name,
            generator_type=spec.generator_type,
            contact_name=spec.contact_name,
            phone=spec.phone,
            email=None,
            address=f"{spec.district} District, Gujarat",
            location=point_from_lat_lng(lat, lng),
        )
        db.add(generator)
        db.flush()  # assigns generator.id without committing yet

        for waste_type, monthly_tonnes, months in spec.waste_profile:
            active_months = months if months is not None else list(range(1, 13))
            for month in active_months:
                # Small realistic month-to-month variation rather than a
                # perfectly flat number every time.
                quantity = round(monthly_tonnes * random.uniform(0.85, 1.15), 1)
                available_from = date(DEMO_YEAR, month, 1)
                available_until = date(DEMO_YEAR, month, days_in_month(DEMO_YEAR, month))
                db.add(
                    WasteRecord(
                        generator_id=generator.id,
                        waste_type=waste_type,
                        quantity_tonnes=quantity,
                        moisture_percent=round(random.uniform(8, 22), 1),
                        available_from=available_from,
                        available_until=available_until,
                        status=random.choice(
                            [WasteStatus.AVAILABLE, WasteStatus.AVAILABLE, WasteStatus.PENDING, WasteStatus.COLLECTED]
                        ),
                    )
                )
                record_count += 1

    db.commit()
    return record_count


def seed_facilities(db: Session) -> int:
    # The first facility is linked to the demo facility@example.com account
    # below (see main()) so the demo login can actually exercise the accept/
    # reject confirmation flow - every other seeded facility stays ownerless
    # (user_id NULL), same as any facility an ADMIN creates on the CRUD page.
    first_facility: Facility | None = None
    for i, spec in enumerate(FACILITIES):
        centre_lat, centre_lng = DISTRICT_CENTRES[spec["district"]]
        lat, lng = jitter(centre_lat, centre_lng, km=5.0)
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
        if i == 0:
            first_facility = facility
    db.commit()

    demo_operator = db.scalar(select(User).where(User.email == "facility@example.com"))
    if demo_operator is not None and first_facility is not None:
        first_facility.user_id = demo_operator.id
        db.commit()
        print(f"Linked '{first_facility.name}' to facility@example.com for the demo confirmation flow.")
    else:
        print(
            "Note: facility@example.com not found - run `python -m scripts.seed_users` first if you want the "
            "demo facility operator account to own a seeded facility."
        )

    return len(FACILITIES)


def main() -> None:
    engine = get_engine()
    with Session(engine) as db:
        print("Clearing previously seeded demo data (if any)...")
        clear_demo_data(db)

        print(f"Seeding {len(GENERATORS)} waste generators + waste records...")
        record_count = seed_generators_and_waste(db)

        print(f"Seeding {len(FACILITIES)} facilities...")
        seed_facilities(db)

        print(f"\nDone: {len(GENERATORS)} generators, {record_count} waste records, {len(FACILITIES)} facilities.")
        print("Every quantity is calibrated against a cited real-world figure - see data/ml-data-research.md.")


if __name__ == "__main__":
    main()
