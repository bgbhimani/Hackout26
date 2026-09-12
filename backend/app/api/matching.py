import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.matching import FacilityRecommendation, MatchOut, MatchRecommendRequest
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/recommend", response_model=list[FacilityRecommendation])
def recommend(payload: MatchRecommendRequest, db: Session = Depends(get_db)) -> list[FacilityRecommendation]:
    return matching_service.recommend_facilities(db, payload.waste_record_id)


@router.get("/{waste_id}", response_model=list[MatchOut])
def get_matches(waste_id: uuid.UUID, db: Session = Depends(get_db)) -> list[MatchOut]:
    return matching_service.get_matches_for_waste_record(db, waste_id)  # type: ignore[return-value]
