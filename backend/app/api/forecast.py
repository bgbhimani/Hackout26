import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.forecast import ForecastOut, ForecastRequest, ForecastResponse
from app.services import forecast_service

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.post("", response_model=ForecastResponse)
def forecast(req: ForecastRequest, db: Session = Depends(get_db)) -> ForecastResponse:
    return forecast_service.generate_forecast(db, req)


@router.get("/{generator_id}", response_model=list[ForecastOut])
def forecast_history(generator_id: uuid.UUID, db: Session = Depends(get_db)) -> list[ForecastOut]:
    return forecast_service.get_forecast_history(db, generator_id)  # type: ignore[return-value]
