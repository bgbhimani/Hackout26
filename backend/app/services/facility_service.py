import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.geo import point_from_lat_lng
from app.models.facility import Facility
from app.schemas.facility import FacilityCreate, FacilityUpdate


def list_facilities(db: Session) -> list[Facility]:
    return list(db.scalars(select(Facility).order_by(Facility.name)))


def get_facility_or_404(db: Session, facility_id: uuid.UUID) -> Facility:
    facility = db.get(Facility, facility_id)
    if facility is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    return facility


def list_own_facilities(db: Session, user_id: uuid.UUID) -> list[Facility]:
    """Every facility this user owns - one from signup
    (auth_service.register_facility_operator), plus any more they've
    registered themselves since. Mirrors generator_service.list_own_generators.
    A demo/pre-existing account, or one that predates this ownership link,
    genuinely owns none - an empty list, not the whole network's roster."""
    return list(db.scalars(select(Facility).where(Facility.user_id == user_id).order_by(Facility.name)))


def create_facility(db: Session, payload: FacilityCreate, owner_id: uuid.UUID | None = None) -> Facility:
    """`owner_id` is only ever the calling user's own id when a
    FACILITY_OPERATOR self-registers an additional facility - an ADMIN
    adding one on someone's behalf leaves it unowned, same as the seeded
    network-wide roster. Mirrors generator_service.create_generator."""
    facility = Facility(
        name=payload.name,
        facility_type=payload.facility_type,
        capacity_tonnes=payload.capacity_tonnes,
        current_load_tonnes=payload.current_load_tonnes,
        accepted_waste_types=payload.accepted_waste_types,
        address=payload.address,
        location=point_from_lat_lng(payload.latitude, payload.longitude),
        user_id=owner_id,
    )
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility


def update_facility(db: Session, facility_id: uuid.UUID, payload: FacilityUpdate) -> Facility:
    facility = get_facility_or_404(db, facility_id)
    data = payload.model_dump(exclude_unset=True)

    if "latitude" in data or "longitude" in data:
        lat = data.pop("latitude", facility.latitude)
        lng = data.pop("longitude", facility.longitude)
        facility.location = point_from_lat_lng(lat, lng)

    if "current_load_tonnes" in data and data["current_load_tonnes"] > (
        data.get("capacity_tonnes", facility.capacity_tonnes)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="current_load_tonnes cannot exceed capacity_tonnes",
        )

    for field, value in data.items():
        setattr(facility, field, value)

    db.commit()
    db.refresh(facility)
    return facility
