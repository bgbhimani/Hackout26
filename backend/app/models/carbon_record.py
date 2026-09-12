import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import FacilityType
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.facility import Facility
    from app.models.waste_record import WasteRecord


class CarbonRecord(Base):
    """The persisted, auditable output of carbon_service.py (Phase 8). Every
    field name matches one step of the calculation chain documented in
    app/constants/carbon_factors.py, and `methodology_note` names exactly
    which constants were used - so a judge (or an auditor) can trace any
    number back to a cited assumption, never a bare literal."""

    __tablename__ = "carbon_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    waste_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("waste_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Added alongside conversion_type (not part of the original schema list)
    # because "Carbon impact by facility" - a required dashboard chart -
    # cannot be attributed to a specific facility from conversion_type
    # (BIOCHAR/BIOGAS/BIOMASS_CONVERSION) alone; several facilities can
    # share a type. See docs/carbon-methodology.md.
    facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    waste_quantity_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    conversion_type: Mapped[FacilityType] = mapped_column(
        Enum(FacilityType, name="facility_type", create_type=False), nullable=False
    )
    conversion_output_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    carbon_content_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    estimated_sequestered_co2_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    transport_emissions_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    net_co2_impact_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    methodology_note: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    waste_record: Mapped["WasteRecord"] = relationship(back_populates="carbon_records")
    facility: Mapped["Facility"] = relationship()

    @property
    def facility_name(self) -> str:
        return self.facility.name

    @property
    def waste_type(self):
        return self.waste_record.waste_type
