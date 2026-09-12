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


def list_own_generators(db: Session, user_id: uuid.UUID) -> list[WasteGenerator]:
    """Every generator entity this user owns - one from signup
    (auth_service.register_waste_generator), plus any more they've since
    registered themselves via POST /api/generators (see create_generator
    below). A demo/pre-existing account that predates this ownership link
    (or that never registered one) genuinely owns none - an empty list,
    not the whole network's roster mislabeled as theirs."""
    return list(
        db.scalars(select(WasteGenerator).where(WasteGenerator.user_id == user_id).order_by(WasteGenerator.name))
    )


def create_generator(db: Session, payload: GeneratorCreate, owner_id: uuid.UUID | None = None) -> WasteGenerator:
    """`owner_id` is only ever the calling user's own id when a
    WASTE_GENERATOR self-registers an additional farm/site (see
    app/api/generators.py) - an ADMIN adding a generator on someone's behalf
    leaves it unowned (None), same as every pre-existing seeded generator."""
    generator = WasteGenerator(
        name=payload.name,
        generator_type=payload.generator_type,
        contact_name=payload.contact_name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        location=point_from_lat_lng(payload.latitude, payload.longitude),
        user_id=owner_id,
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
