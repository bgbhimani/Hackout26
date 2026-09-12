import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants.enums import WasteType


class ForecastRequest(BaseModel):
    generator_id: uuid.UUID
    waste_type: WasteType
    forecast_month: str = Field(description='Format: "YYYY-MM", e.g. "2026-10"')

    @field_validator("forecast_month")
    @classmethod
    def _validate_month_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m")
        except ValueError as exc:
            raise ValueError('forecast_month must be in "YYYY-MM" format') from exc
        return v


class ForecastResponse(BaseModel):
    predicted_quantity_tonnes: float
    confidence: float
    model: str


class ForecastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    generator_id: uuid.UUID
    waste_type: WasteType
    forecast_date: date
    predicted_quantity_tonnes: float
    confidence: float
    model_name: str
    created_at: datetime
