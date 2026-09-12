import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import WasteStatus, WasteType
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.carbon_record import CarbonRecord
    from app.models.match import Match
    from app.models.waste_generator import WasteGenerator


class WasteRecord(Base):
    __tablename__ = "waste_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    generator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("waste_generators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    waste_type: Mapped[WasteType] = mapped_column(Enum(WasteType, name="waste_type"), nullable=False, index=True)
    quantity_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    moisture_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    available_from: Mapped[date] = mapped_column(Date, nullable=False)
    available_until: Mapped[date | None] = mapped_column(Date)
    status: Mapped[WasteStatus] = mapped_column(
        Enum(WasteStatus, name="waste_status"), nullable=False, default=WasteStatus.AVAILABLE, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    generator: Mapped["WasteGenerator"] = relationship(back_populates="waste_records")
    matches: Mapped[list["Match"]] = relationship(back_populates="waste_record", cascade="all, delete-orphan")
    carbon_records: Mapped[list["CarbonRecord"]] = relationship(
        back_populates="waste_record", cascade="all, delete-orphan"
    )
