import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.constants.enums import FacilityType, WasteType


class CarbonCalculateRequest(BaseModel):
    waste_record_id: uuid.UUID
    facility_id: uuid.UUID


class CarbonRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    waste_record_id: uuid.UUID
    facility_id: uuid.UUID
    facility_name: str
    waste_type: WasteType
    waste_quantity_tonnes: float
    conversion_type: FacilityType
    conversion_output_tonnes: float
    carbon_content_percent: float
    estimated_sequestered_co2_tonnes: float
    transport_emissions_tonnes: float
    net_co2_impact_tonnes: float
    methodology_note: str
    created_at: datetime
