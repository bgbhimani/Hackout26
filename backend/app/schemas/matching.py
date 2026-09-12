import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.constants.enums import FacilityType, MatchStatus, WasteType


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
    # The persisted Match row this recommendation corresponds to (recommend_
    # facilities() always persists as RECOMMENDED - see matching_service.py).
    # The frontend needs this to do nothing more than show "request sent";
    # only the facility operator can act on it via POST /{match_id}/accept.
    match_id: uuid.UUID | None = None


class MatchOut(BaseModel):
    """Shape of a persisted Match row (GET /api/matching/{waste_id}). Only
    the final blended score and text reasons are persisted - see Match model;
    the live per-component breakdown is only available from a fresh
    POST /api/matching/recommend call."""

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
    created_at: datetime


class PendingMatchOut(MatchOut):
    """MatchOut plus the waste-side context a facility operator needs to
    actually decide whether to accept - who's offering what. Used by
    GET /api/matching/pending and GET /api/matching/accepted; the plain
    MatchOut shape (no waste details) remains what GET /{waste_id} returns,
    since a generator viewing their own waste record's matches already
    knows what waste it is."""

    waste_type: WasteType
    quantity_tonnes: float
    generator_name: str
