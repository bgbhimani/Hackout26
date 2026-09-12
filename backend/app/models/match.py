import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import MatchStatus, OfferParty
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.facility import Facility
    from app.models.match_offer import MatchOffer
    from app.models.waste_record import WasteRecord


class Match(Base):
    """A scored request from `waste_record` -> `facility`, produced by
    matching_service.py. The score and its component breakdown are
    persisted (not just returned once) so the Matching page can show recent
    requests and the Route Optimization page can reference an accepted
    match without recomputing it.

    Negotiation state: offer_price/offer_pickup_date/offer_note/offer_round
    always hold the CURRENT outstanding terms - whoever isn't last_offer_by
    is the one who can accept/reject/counter them next. The full back-and-
    forth (every request/counter/accept/reject/withdraw) is preserved
    separately in MatchOffer, since these columns are overwritten on every
    counter."""

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
        Enum(MatchStatus, name="match_status"), nullable=False, default=MatchStatus.REQUESTED
    )

    # Whoever proposed the terms below - the OTHER party is the one who can
    # currently accept/reject/counter them. Always GENERATOR at creation,
    # since a generator always initiates the request.
    last_offer_by: Mapped[OfferParty] = mapped_column(
        Enum(OfferParty, name="offer_party"), nullable=False, default=OfferParty.GENERATOR
    )
    offer_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    offer_pickup_date: Mapped[date | None] = mapped_column(Date)
    offer_note: Mapped[str | None] = mapped_column(String(1000))
    # How many offers (request + counters) this match has seen - 1 at
    # creation, incremented on every counter. Purely informational.
    offer_round: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    waste_record: Mapped["WasteRecord"] = relationship(back_populates="matches")
    facility: Mapped["Facility"] = relationship(back_populates="matches")
    offers: Mapped[list["MatchOffer"]] = relationship(
        back_populates="match", cascade="all, delete-orphan", order_by="MatchOffer.created_at"
    )

    @property
    def facility_name(self) -> str:
        # MatchOut always requires this, but it isn't a column on `matches` -
        # every endpoint that returns a bare Match (accept/reject/counter/
        # withdraw/send_request) relies on this rather than hand-building a
        # dict each time. Requires match.facility to be loaded (it always is:
        # either just inserted in this session, or fetched with
        # joinedload(Match.facility) - see _load_match_for_negotiation).
        return self.facility.name
