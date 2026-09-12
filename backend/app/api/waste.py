import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.constants.enums import UserRole
from app.database.session import get_db
from app.schemas.waste import WasteRecordCreate, WasteRecordOut, WasteRecordUpdate, WasteRecordWithGeneratorOut
from app.services import waste_service

router = APIRouter(prefix="/api/waste", tags=["waste"])

_WRITE_ROLES = (UserRole.ADMIN, UserRole.WASTE_GENERATOR)


@router.get("", response_model=list[WasteRecordWithGeneratorOut])
def list_waste_records(db: Session = Depends(get_db)) -> list[WasteRecordWithGeneratorOut]:
    records = waste_service.list_waste_records(db)
    return [
        WasteRecordWithGeneratorOut(
            **WasteRecordOut.model_validate(r).model_dump(),
            generator_name=r.generator.name,
            generator_type=r.generator.generator_type.value,
            latitude=r.generator.latitude,
            longitude=r.generator.longitude,
        )
        for r in records
    ]


@router.post("", response_model=WasteRecordOut, status_code=status.HTTP_201_CREATED)
def create_waste_record(
    payload: WasteRecordCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(*_WRITE_ROLES)),
) -> WasteRecordOut:
    return waste_service.create_waste_record(db, payload)  # type: ignore[return-value]


@router.get("/{waste_id}", response_model=WasteRecordOut)
def get_waste_record(waste_id: uuid.UUID, db: Session = Depends(get_db)) -> WasteRecordOut:
    return waste_service.get_waste_record_or_404(db, waste_id)  # type: ignore[return-value]


@router.put("/{waste_id}", response_model=WasteRecordOut)
def update_waste_record(
    waste_id: uuid.UUID,
    payload: WasteRecordUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(*_WRITE_ROLES)),
) -> WasteRecordOut:
    return waste_service.update_waste_record(db, waste_id, payload)  # type: ignore[return-value]
