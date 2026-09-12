import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.constants.enums import WasteStatus, WasteType


class WasteRecordCreate(BaseModel):
    generator_id: uuid.UUID
    waste_type: WasteType
    quantity_tonnes: float = Field(gt=0)
    moisture_percent: float | None = Field(default=None, ge=0, le=100)
    available_from: date
    available_until: date | None = None

    @model_validator(mode="after")
    def _check_date_order(self) -> "WasteRecordCreate":
        if self.available_until and self.available_until < self.available_from:
            raise ValueError("available_until cannot be before available_from")
        return self


class WasteRecordUpdate(BaseModel):
    waste_type: WasteType | None = None
    quantity_tonnes: float | None = Field(default=None, gt=0)
    moisture_percent: float | None = Field(default=None, ge=0, le=100)
    available_from: date | None = None
    available_until: date | None = None
    status: WasteStatus | None = None


class WasteRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    generator_id: uuid.UUID
    waste_type: WasteType
    quantity_tonnes: float
    moisture_percent: float | None
    available_from: date
    available_until: date | None
    status: WasteStatus
    created_at: datetime
    updated_at: datetime


class WasteRecordWithGeneratorOut(WasteRecordOut):
    """Used by list endpoints that join generator name/location so the
    frontend table and map don't need a second round-trip per row."""

    generator_name: str
    generator_type: str
    latitude: float
    longitude: float
