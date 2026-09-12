import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.constants.enums import FacilityType, MatchStatus, OfferAction, OfferParty, WasteType


class MatchRecommendRequest(BaseModel):
    waste_record_id: uuid.UUID


class ScoreBreakdown(BaseModel):
    """The four weighted components behind match_score, each 0-100 before
    weighting - this is what "do not hide the reasoning" means concretely."""

    compatibility: float
    distance: float
    capacity: float
    utilization: float


class FacilityRecommendation(BaseModel):
    facility_id: uuid.UUID
    facility_name: str
    facility_type: FacilityType
    match_score: float
    distance_km: float
    available_capacity_tonnes: float
    accepted_waste_types: list[WasteType]
    estimated_transport_cost: float
    reasons: list[str]
    score_breakdown: ScoreBreakdown
    # A recommendation is only a preview - POST /recommend never persists
    # anything. These are non-null only if the generator has already sent
    # (or previously sent) a request to this facility for this waste record,
    # so the card can show its real status instead of a "Send Request"
    # button for something already in flight.
    match_id: uuid.UUID | None = None
    match_status: MatchStatus | None = None


class SendRequestPayload(BaseModel):
    """What POST /api/matching/request needs to actually create a match -
    the explicit "Send Request" action a generator takes on a recommendation
    card. Everything scoring-related (distance, cost, breakdown) is
    recomputed server-side from waste_record_id/facility_id rather than
    trusted from whatever the client last saw."""

    waste_record_id: uuid.UUID
    facility_id: uuid.UUID
    offer_price: float | None = Field(default=None, ge=0, description="Total ₹ the generator is asking for this batch")
    offer_pickup_date: date | None = None
    note: str | None = Field(default=None, max_length=1000)


class CounterOfferPayload(BaseModel):
    """Either side can propose different terms while a match is REQUESTED or
    COUNTERED. Whoever calls this becomes the new last_offer_by; the other
    side then accepts, rejects, or counters again."""

    offer_price: float | None = Field(default=None, ge=0)
    offer_pickup_date: date | None = None
    note: str | None = Field(default=None, max_length=1000)


class MatchOfferOut(BaseModel):
    """One entry in a match's negotiation thread (GET /{match_id}/offers)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    offered_by: OfferParty
    action: OfferAction
    offer_price: float | None
    offer_pickup_date: date | None
    note: str | None
    created_at: datetime


class MatchOut(BaseModel):
    """Shape of a persisted Match row. Only the final blended score and text
    reasons are persisted - see Match model; the live per-component
    breakdown is only available from a fresh POST /api/matching/recommend
    call."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    waste_record_id: uuid.UUID
    facility_id: uuid.UUID
    facility_name: str
    compatibility_score: float
    distance_km: float
    estimated_transport_cost: float
    reasons: list[str]
    status: MatchStatus
    last_offer_by: OfferParty
    offer_price: float | None
    offer_pickup_date: date | None
    offer_note: str | None
    offer_round: int
    created_at: datetime


class PendingMatchOut(MatchOut):
    """MatchOut plus the context both sides of a negotiation need - who's
    offering what, and whose turn it is to respond. The same shape serves
    GET /api/matching/pending (a facility operator's incoming requests),
    GET /api/matching/accepted, and GET /api/matching/my-requests (a
    generator's sent requests) - a match always has one generator side and
    one facility side regardless of who's viewing it."""

    waste_type: WasteType
    quantity_tonnes: float
    generator_name: str
    facility_type: FacilityType
    # True when it's the CALLER's turn to accept/reject/counter (i.e. the
    # other side made the last offer). Computed per-viewer server-side -
    # never inferred from status/last_offer_by alone on the frontend.
    can_respond: bool
