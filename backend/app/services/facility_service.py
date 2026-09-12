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


def create_facility(db: Session, payload: FacilityCreate) -> Facility:
    facility = Facility(
        name=payload.name,
        facility_type=payload.facility_type,
        capacity_tonnes=payload.capacity_tonnes,
        current_load_tonnes=payload.current_load_tonnes,
        accepted_waste_types=payload.accepted_waste_types,
        address=payload.address,
        location=point_from_lat_lng(payload.latitude, payload.longitude),
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
