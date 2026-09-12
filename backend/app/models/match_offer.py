import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import OfferAction, OfferParty
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.match import Match


class MatchOffer(Base):
    """One turn in a Match's request/accept/reject/counter-offer negotiation
    thread - append-only, so the full back-and-forth stays visible to both
    sides even after the match reaches a terminal state. Match itself only
    ever holds the CURRENT outstanding terms; this table is the history
    behind them, rendered as a timeline on the Requests / My Requests pages."""

    __tablename__ = "match_offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    offered_by: Mapped[OfferParty] = mapped_column(Enum(OfferParty, name="offer_party"), nullable=False)
    action: Mapped[OfferAction] = mapped_column(Enum(OfferAction, name="offer_action"), nullable=False)
    # Null for a plain ACCEPT/REJECT/WITHDRAW that doesn't change terms -
    # populated for REQUEST/COUNTER, and copied onto ACCEPT so the thread
    # shows exactly what was agreed to.
    offer_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    offer_pickup_date: Mapped[date | None] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(String(1000))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    match: Mapped["Match"] = relationship(back_populates="offers")
