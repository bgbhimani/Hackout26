import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.carbon import CarbonCalculateRequest, CarbonRecordOut
from app.services import carbon_service

router = APIRouter(prefix="/api/carbon", tags=["carbon"])


@router.post("/calculate", response_model=CarbonRecordOut)
def calculate(req: CarbonCalculateRequest, db: Session = Depends(get_db)) -> CarbonRecordOut:
    return carbon_service.calculate_carbon_impact(db, req)


@router.get("", response_model=list[CarbonRecordOut])
def list_records(db: Session = Depends(get_db)) -> list[CarbonRecordOut]:
    return carbon_service.list_carbon_records(db)


@router.get("/{waste_id}", response_model=list[CarbonRecordOut])
def get_records(waste_id: uuid.UUID, db: Session = Depends(get_db)) -> list[CarbonRecordOut]:
    return carbon_service.get_carbon_records_for_waste_record(db, waste_id)
