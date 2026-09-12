import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.geo import point_from_lat_lng
from app.models.waste_generator import WasteGenerator
from app.schemas.generator import GeneratorCreate, GeneratorUpdate


def list_generators(db: Session) -> list[WasteGenerator]:
    return list(db.scalars(select(WasteGenerator).order_by(WasteGenerator.name)))


def get_generator_or_404(db: Session, generator_id: uuid.UUID) -> WasteGenerator:
    generator = db.get(WasteGenerator, generator_id)
    if generator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste generator not found")
    return generator


def create_generator(db: Session, payload: GeneratorCreate) -> WasteGenerator:
    generator = WasteGenerator(
        name=payload.name,
        generator_type=payload.generator_type,
        contact_name=payload.contact_name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        location=point_from_lat_lng(payload.latitude, payload.longitude),
    )
    db.add(generator)
    db.commit()
    db.refresh(generator)
    return generator


def update_generator(db: Session, generator_id: uuid.UUID, payload: GeneratorUpdate) -> WasteGenerator:
    generator = get_generator_or_404(db, generator_id)
    data = payload.model_dump(exclude_unset=True)

    if "latitude" in data or "longitude" in data:
        lat = data.pop("latitude", generator.latitude)
        lng = data.pop("longitude", generator.longitude)
        generator.location = point_from_lat_lng(lat, lng)

    for field, value in data.items():
        setattr(generator, field, value)

    db.commit()
    db.refresh(generator)
    return generator


def delete_generator(db: Session, generator_id: uuid.UUID) -> None:
    generator = get_generator_or_404(db, generator_id)
    db.delete(generator)
    db.commit()
