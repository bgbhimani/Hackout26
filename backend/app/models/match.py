import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import MatchStatus
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.facility import Facility
    from app.models.waste_record import WasteRecord


class Match(Base):
    """A scored recommendation of `waste_record` -> `facility`, produced by
    matching_service.py (Phase 5). The score and its component breakdown are
    persisted (not just returned once) so the Matching page can show recent
    recommendations and the Route Optimization page can reference an accepted
    match without recomputing it."""

    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    waste_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("waste_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    compatibility_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    distance_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    estimated_transport_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    # Human-readable explanation strings, e.g. "Compatible waste type", shown
    # verbatim in the UI - the scoring must stay explainable, never a black box.
    reasons: Mapped[list[str]] = mapped_column(ARRAY(String(200)), nullable=False, default=list)
    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus, name="match_status"), nullable=False, default=MatchStatus.RECOMMENDED
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    waste_record: Mapped["WasteRecord"] = relationship(back_populates="matches")
    facility: Mapped["Facility"] = relationship(back_populates="matches")
