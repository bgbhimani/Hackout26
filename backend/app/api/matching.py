import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import AuthenticatedUser, get_current_user, require_role
from app.constants.enums import UserRole
from app.database.session import get_db
from app.schemas.matching import (
    CounterOfferPayload,
    FacilityRecommendation,
    MatchOfferOut,
    MatchOut,
    MatchRecommendRequest,
    PendingMatchOut,
    SendRequestPayload,
)
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["matching"])

# Either side of a negotiation can accept/reject/counter - matching_service
# resolves exactly which side the caller is (by ownership) and 404s if
# they're neither, so this is deliberately broader than a single role.
_NEGOTIATION_ROLES = (UserRole.WASTE_GENERATOR, UserRole.FACILITY_OPERATOR)


@router.post("/recommend", response_model=list[FacilityRecommendation])
def recommend(payload: MatchRecommendRequest, db: Session = Depends(get_db)) -> list[FacilityRecommendation]:
    return matching_service.recommend_facilities(db, payload.waste_record_id)


# NOTE: every literal-path route below (/pending, /accepted, /my-requests,
# /request) must be declared BEFORE GET /{waste_id} - FastAPI matches path
# templates in declaration order, and a bare {waste_id} segment would
# otherwise swallow "pending"/"accepted"/etc. as an attempted (invalid) UUID.
# The /{match_id}/... routes don't have this problem: they have a different
# number of path segments than /{waste_id}, so declaration order between
# them doesn't matter.


@router.get("/pending", response_model=list[PendingMatchOut])
def list_pending_for_my_facility(
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.FACILITY_OPERATOR)),
) -> list[PendingMatchOut]:
    """A Facility Operator's Requests inbox: every REQUESTED/COUNTERED match
    offered to a facility they operate."""
    return matching_service.get_pending_matches_for_operator(db, current.id)


@router.get("/accepted", response_model=list[PendingMatchOut])
def list_accepted_for_facility(
    facility_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.FACILITY_OPERATOR, UserRole.ADMIN)),
) -> list[PendingMatchOut]:
    """ACCEPTED-but-not-yet-routed matches for one facility - what the
    Routes page offers to build a pickup route from."""
    return matching_service.get_accepted_matches_for_facility(db, facility_id, current)


@router.get("/my-requests", response_model=list[PendingMatchOut])
def list_my_requests(
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.WASTE_GENERATOR)),
) -> list[PendingMatchOut]:
    """A Waste Generator's My Requests page: every request they've sent,
    across every status."""
    return matching_service.get_my_requests_for_generator(db, current.id)


@router.post("/request", response_model=MatchOut, status_code=201)
def send_request(
    payload: SendRequestPayload,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.WASTE_GENERATOR)),
) -> MatchOut:
    """The explicit "Send Request" action on a recommendation card - this is
    what actually creates a Match and puts it in the facility's inbox.
    POST /recommend itself never does this."""
    return matching_service.send_request(db, payload, current)


@router.post("/{match_id}/accept", response_model=MatchOut)
def accept(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(*_NEGOTIATION_ROLES)),
) -> MatchOut:
    return matching_service.accept_match(db, match_id, current)


@router.post("/{match_id}/reject", response_model=MatchOut)
def reject(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(*_NEGOTIATION_ROLES)),
) -> MatchOut:
    return matching_service.reject_match(db, match_id, current)


@router.post("/{match_id}/counter", response_model=MatchOut)
def counter(
    match_id: uuid.UUID,
    payload: CounterOfferPayload,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(*_NEGOTIATION_ROLES)),
) -> MatchOut:
    return matching_service.counter_offer(db, match_id, current, payload)


@router.post("/{match_id}/withdraw", response_model=MatchOut)
def withdraw(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.WASTE_GENERATOR)),
) -> MatchOut:
    return matching_service.withdraw_request(db, match_id, current)


@router.get("/{match_id}/offers", response_model=list[MatchOfferOut])
def offers(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(get_current_user),
) -> list[MatchOfferOut]:
    """The full negotiation thread for one match - either side of it can
    read it; matching_service 404s for anyone else."""
    return matching_service.get_offers_for_match(db, match_id, current)  # type: ignore[return-value]


@router.get("/{waste_id}", response_model=list[MatchOut])
def get_matches(waste_id: uuid.UUID, db: Session = Depends(get_db)) -> list[MatchOut]:
    return matching_service.get_matches_for_waste_record(db, waste_id)
