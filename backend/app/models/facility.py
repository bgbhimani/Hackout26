import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geography
from sqlalchemy import ARRAY, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import FacilityStatus, FacilityType, WasteType
from app.database.base import Base
from app.database.geo import lat_lng_from_point

if TYPE_CHECKING:
    from app.models.match import Match
    from app.models.route import Route


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    facility_type: Mapped[FacilityType] = mapped_column(
        Enum(FacilityType, name="facility_type"), nullable=False, index=True
    )
    capacity_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    current_load_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    accepted_waste_types: Mapped[list[WasteType]] = mapped_column(
        ARRAY(Enum(WasteType, name="waste_type", create_type=False)), nullable=False
    )
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    location: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    status: Mapped[FacilityStatus] = mapped_column(
        Enum(FacilityStatus, name="facility_status"), nullable=False, default=FacilityStatus.ACTIVE
    )
    # The Facility Operator who registered this facility (nullable: facilities
    # seeded by scripts/seed_demo_data.py, or created by an ADMIN on someone's
    # behalf, have no owner). ON DELETE SET NULL rather than CASCADE - deleting
    # a user account should orphan the facility, not delete it and every match/
    # route/carbon record built on it. This is what lets the accept/reject
    # confirmation flow (matching_service.accept_match) verify that only the
    # operator who actually runs this facility can act on a match for it.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    matches: Mapped[list["Match"]] = relationship(back_populates="facility", cascade="all, delete-orphan")
    routes: Mapped[list["Route"]] = relationship(back_populates="facility", cascade="all, delete-orphan")

    @property
    def utilization_percent(self) -> float:
        # Numeric columns come back from SQLAlchemy as decimal.Decimal, which
        # doesn't mix with plain floats in arithmetic (see matching_service.py,
        # which does float - float). Cast at the source instead of at every
        # call site.
        if not self.capacity_tonnes:
            return 0.0
        return round((float(self.current_load_tonnes) / float(self.capacity_tonnes)) * 100, 1)

    @property
    def latitude(self) -> float:
        return lat_lng_from_point(self.location)[0]

    @property
    def longitude(self) -> float:
        return lat_lng_from_point(self.location)[1]
