import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import RouteStatus
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.facility import Facility
    from app.models.route_stop import RouteStop


class Route(Base):
    """The output of a single OR-Tools solve (route_service.py, Phase 6):
    an ordered set of RouteStop rows ending at `facility`. `route_geometry`
    stores the actual road-path geometry (LineString) for map rendering,
    separate from the straight generator-to-generator stop order."""

    __tablename__ = "routes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_capacity_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_distance_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    estimated_transport_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_waste_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    route_geometry: Mapped[str | None] = mapped_column(Geography(geometry_type="LINESTRING", srid=4326))
    status: Mapped[RouteStatus] = mapped_column(
        Enum(RouteStatus, name="route_status"), nullable=False, default=RouteStatus.PLANNED
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    facility: Mapped["Facility"] = relationship(back_populates="routes")
    stops: Mapped[list["RouteStop"]] = relationship(
        back_populates="route", cascade="all, delete-orphan", order_by="RouteStop.stop_order"
    )
