import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.waste_generator import WasteGenerator
from app.models.waste_record import WasteRecord
from app.schemas.waste import WasteRecordCreate, WasteRecordUpdate


def list_waste_records(db: Session) -> list[WasteRecord]:
    return list(
        db.scalars(
            select(WasteRecord)
            .options(joinedload(WasteRecord.generator))
            .order_by(WasteRecord.available_from.desc())
        )
    )


def get_waste_record_or_404(db: Session, waste_record_id: uuid.UUID) -> WasteRecord:
    record = db.get(WasteRecord, waste_record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")
    return record


def create_waste_record(db: Session, payload: WasteRecordCreate) -> WasteRecord:
    generator = db.get(WasteGenerator, payload.generator_id)
    if generator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste generator not found")

    record = WasteRecord(
        generator_id=payload.generator_id,
        waste_type=payload.waste_type,
        quantity_tonnes=payload.quantity_tonnes,
        moisture_percent=payload.moisture_percent,
        available_from=payload.available_from,
        available_until=payload.available_until,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_waste_record(db: Session, waste_record_id: uuid.UUID, payload: WasteRecordUpdate) -> WasteRecord:
    record = get_waste_record_or_404(db, waste_record_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record
