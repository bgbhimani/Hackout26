import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import AuthenticatedUser, require_role
from app.constants.enums import UserRole
from app.database.session import get_db
from app.schemas.matching import FacilityRecommendation, MatchOut, MatchRecommendRequest, PendingMatchOut
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/recommend", response_model=list[FacilityRecommendation])
def recommend(payload: MatchRecommendRequest, db: Session = Depends(get_db)) -> list[FacilityRecommendation]:
    return matching_service.recommend_facilities(db, payload.waste_record_id)


# NOTE: these literal-path routes (/pending, /accepted, /{match_id}/accept,
# /{match_id}/reject) must be declared BEFORE GET /{waste_id} below - FastAPI
# matches path templates in declaration order, and a bare {waste_id} segment
# would otherwise swallow "pending"/"accepted" as an attempted (invalid) UUID.


@router.get("/pending", response_model=list[PendingMatchOut])
def list_pending_for_my_facility(
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.FACILITY_OPERATOR)),
) -> list[PendingMatchOut]:
    """A Facility Operator's incoming-requests inbox: every RECOMMENDED
    match offered to a facility they operate, awaiting accept/reject."""
    return matching_service.get_pending_matches_for_operator(db, current.id)  # type: ignore[return-value]


@router.get("/accepted", response_model=list[PendingMatchOut])
def list_accepted_for_facility(
    facility_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.FACILITY_OPERATOR, UserRole.ADMIN)),
) -> list[PendingMatchOut]:
    """ACCEPTED-but-not-yet-routed matches for one facility - what the Routes
    page offers to build a route from. FACILITY_OPERATOR must own the
    facility; ADMIN can query any (matches POST /api/routes/optimize's role
    gate)."""
    return matching_service.get_accepted_matches_for_facility(db, facility_id, current)  # type: ignore[return-value]


@router.post("/{match_id}/accept", response_model=MatchOut)
def accept(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.FACILITY_OPERATOR)),
) -> MatchOut:
    return matching_service.accept_match(db, match_id, current)  # type: ignore[return-value]


@router.post("/{match_id}/reject", response_model=MatchOut)
def reject(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(UserRole.FACILITY_OPERATOR)),
) -> MatchOut:
    return matching_service.reject_match(db, match_id, current)  # type: ignore[return-value]


@router.get("/{waste_id}", response_model=list[MatchOut])
def get_matches(waste_id: uuid.UUID, db: Session = Depends(get_db)) -> list[MatchOut]:
    return matching_service.get_matches_for_waste_record(db, waste_id)  # type: ignore[return-value]
