import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants.enums import FACILITY_WASTE_COMPATIBILITY, FacilityStatus, FacilityType, WasteType


class FacilityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    facility_type: FacilityType
    capacity_tonnes: float = Field(gt=0)
    current_load_tonnes: float = Field(default=0, ge=0)
    accepted_waste_types: list[WasteType] = Field(min_length=1)
    address: str = Field(min_length=1, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    @field_validator("accepted_waste_types")
    @classmethod
    def _validate_compatibility(cls, v: list[WasteType], info) -> list[WasteType]:
        facility_type = info.data.get("facility_type")
        if facility_type is None:
            return v
        allowed = set(FACILITY_WASTE_COMPATIBILITY.get(facility_type, []))
        invalid = [w for w in v if w not in allowed]
        if invalid:
            raise ValueError(
                f"{facility_type.value} facilities cannot accept: {', '.join(w.value for w in invalid)}"
            )
        return v


class FacilityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    capacity_tonnes: float | None = Field(default=None, gt=0)
    current_load_tonnes: float | None = Field(default=None, ge=0)
    accepted_waste_types: list[WasteType] | None = None
    address: str | None = Field(default=None, min_length=1, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    status: FacilityStatus | None = None


class FacilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    facility_type: FacilityType
    capacity_tonnes: float
    current_load_tonnes: float
    utilization_percent: float
    accepted_waste_types: list[WasteType]
    address: str
    latitude: float
    longitude: float
    status: FacilityStatus
    created_at: datetime
    updated_at: datetime
