import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import GeneratorType
from app.database.base import Base
from app.database.geo import lat_lng_from_point

if TYPE_CHECKING:
    from app.models.forecast import Forecast
    from app.models.waste_record import WasteRecord


class WasteGenerator(Base):
    __tablename__ = "waste_generators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    generator_type: Mapped[GeneratorType] = mapped_column(
        Enum(GeneratorType, name="generator_type"), nullable=False, index=True
    )
    contact_name: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(320))
    address: Mapped[str] = mapped_column(String(500), nullable=False)

    # PostGIS geography point, SRID 4326 (WGS84 lat/lng) - geography (not geometry)
    # so that ST_Distance returns metres directly without a manual projection.
    location: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    # The Waste Generator user who registered this entity (nullable: demo-
    # seeded generators, or ones an ADMIN creates on someone's behalf, have
    # no owner). Mirrors Facility.user_id - see that model's comment for why
    # ON DELETE SET NULL rather than CASCADE. This is what lets a Waste
    # Generator's map show their own location without showing everyone
    # else's (see frontend/app/(app)/map/page.tsx).
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    waste_records: Mapped[list["WasteRecord"]] = relationship(
        back_populates="generator", cascade="all, delete-orphan"
    )
    forecasts: Mapped[list["Forecast"]] = relationship(
        back_populates="generator", cascade="all, delete-orphan"
    )

    @property
    def latitude(self) -> float:
        return lat_lng_from_point(self.location)[0]

    @property
    def longitude(self) -> float:
        return lat_lng_from_point(self.location)[1]
