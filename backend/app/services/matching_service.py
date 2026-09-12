"""
Transparent, weighted facility-matching engine. This is explicitly NOT
described as AI - it's a documented scoring formula over real data, and
every score is explainable via ScoreBreakdown + the reasons list. See
app/constants/matching_config.py for every weight and threshold used here.

SCORING (per waste record, against each ACTIVE facility that accepts its
waste type):
  1. Compatibility (40%) - binary gate: only facilities whose
     accepted_waste_types include this waste_type are considered at all,
     so among returned candidates this is always 100.
  2. Distance (25%) - real PostGIS ST_Distance (geography, so it's an
     accurate geodesic distance in metres, not a flat-earth approximation),
     linearly scored from 100 at 0km down to 0 at MAX_MATCHING_DISTANCE_KM.
  3. Capacity (20%) - 100 if the facility's free capacity
     (capacity_tonnes - current_load_tonnes) covers the whole waste
     quantity, otherwise proportional partial credit.
  4. Utilization (15%) - 100 minus the facility's current utilization % -
     an idle facility scores higher than an already-strained one.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants.enums import FacilityStatus, MatchStatus
from app.constants.matching_config import (
    MATCHING_WEIGHTS,
    MAX_MATCHING_DISTANCE_KM,
    MAX_RECOMMENDATIONS,
    TRANSPORT_COST_PER_TONNE_KM,
)
from app.models.facility import Facility
from app.models.match import Match
from app.models.waste_record import WasteRecord
from app.schemas.matching import FacilityRecommendation, ScoreBreakdown


def _distance_score(distance_km: float) -> float:
    return max(0.0, 100.0 - (distance_km / MAX_MATCHING_DISTANCE_KM * 100.0))


def _capacity_score(available_capacity_tonnes: float, quantity_tonnes: float) -> float:
    if quantity_tonnes <= 0:
        return 100.0
    if available_capacity_tonnes >= quantity_tonnes:
        return 100.0
    return max(0.0, (available_capacity_tonnes / quantity_tonnes) * 100.0)


def _utilization_score(utilization_percent: float) -> float:
    return max(0.0, 100.0 - utilization_percent)


def _build_reasons(
    *, distance_km: float, available_capacity_tonnes: float, quantity_tonnes: float, utilization_percent: float
) -> list[str]:
    reasons = ["Compatible waste type"]

    if available_capacity_tonnes >= quantity_tonnes:
        reasons.append("Sufficient capacity")
    else:
        reasons.append(
            f"Limited capacity ({available_capacity_tonnes:.1f}t available, {quantity_tonnes:.1f}t needed)"
        )

    if distance_km <= MAX_MATCHING_DISTANCE_KM * 0.3:
        reasons.append("Short transport distance")
    elif distance_km <= MAX_MATCHING_DISTANCE_KM * 0.7:
        reasons.append("Moderate transport distance")
    else:
        reasons.append("Long transport distance")

    if utilization_percent < 50:
        reasons.append("Low facility utilization")
    elif utilization_percent > 80:
        reasons.append("High facility utilization")

    return reasons


def recommend_facilities(db: Session, waste_record_id: uuid.UUID) -> list[FacilityRecommendation]:
    waste_record = db.get(WasteRecord, waste_record_id)
    if waste_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")

    generator = waste_record.generator
    origin_wkt = f"POINT({generator.longitude} {generator.latitude})"
    distance_km_expr = func.ST_Distance(func.ST_GeogFromText(origin_wkt), Facility.location) / 1000.0

    rows = db.execute(
        select(Facility, distance_km_expr.label("distance_km"))
        .where(
            Facility.status == FacilityStatus.ACTIVE,
            Facility.accepted_waste_types.any(waste_record.waste_type),
        )
        .order_by(distance_km_expr)
    ).all()

    recommendations: list[FacilityRecommendation] = []
    for facility, distance_km in rows:
        distance_km = float(distance_km)
        available_capacity = float(facility.capacity_tonnes) - float(facility.current_load_tonnes)
        quantity = float(waste_record.quantity_tonnes)

        breakdown = ScoreBreakdown(
            compatibility=100.0,
            distance=round(_distance_score(distance_km), 1),
            capacity=round(_capacity_score(available_capacity, quantity), 1),
            utilization=round(_utilization_score(facility.utilization_percent), 1),
        )
        final_score = round(
            breakdown.compatibility * MATCHING_WEIGHTS["compatibility"]
            + breakdown.distance * MATCHING_WEIGHTS["distance"]
            + breakdown.capacity * MATCHING_WEIGHTS["capacity"]
            + breakdown.utilization * MATCHING_WEIGHTS["utilization"],
            1,
        )

        recommendations.append(
            FacilityRecommendation(
                facility_id=facility.id,
                facility_name=facility.name,
                facility_type=facility.facility_type,
                match_score=final_score,
                distance_km=round(distance_km, 1),
                available_capacity_tonnes=round(available_capacity, 1),
                accepted_waste_types=facility.accepted_waste_types,
                estimated_transport_cost=round(distance_km * TRANSPORT_COST_PER_TONNE_KM * quantity, 2),
                reasons=_build_reasons(
                    distance_km=distance_km,
                    available_capacity_tonnes=available_capacity,
                    quantity_tonnes=quantity,
                    utilization_percent=facility.utilization_percent,
                ),
                score_breakdown=breakdown,
            )
        )

    recommendations.sort(key=lambda r: r.match_score, reverse=True)
    recommendations = recommendations[:MAX_RECOMMENDATIONS]

    _persist_recommendations(db, waste_record_id, recommendations)
    return recommendations


def _persist_recommendations(
    db: Session, waste_record_id: uuid.UUID, recommendations: list[FacilityRecommendation]
) -> None:
    """Replaces previously RECOMMENDED matches for this waste record with
    the fresh set, so GET /api/matching/{waste_id} reflects the latest
    computation. Matches a human has already ACCEPTED or REJECTED are left
    untouched - re-running the recommender must never silently erase a
    decision someone made."""
    stale = db.scalars(
        select(Match).where(Match.waste_record_id == waste_record_id, Match.status == MatchStatus.RECOMMENDED)
    ).all()
    for m in stale:
        db.delete(m)

    for rec in recommendations:
        db.add(
            Match(
                waste_record_id=waste_record_id,
                facility_id=rec.facility_id,
                compatibility_score=rec.match_score,
                distance_km=rec.distance_km,
                estimated_transport_cost=rec.estimated_transport_cost,
                reasons=rec.reasons,
                status=MatchStatus.RECOMMENDED,
            )
        )
    db.commit()


def get_matches_for_waste_record(db: Session, waste_record_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        select(Match, Facility.name.label("facility_name"))
        .join(Facility, Facility.id == Match.facility_id)
        .where(Match.waste_record_id == waste_record_id)
        .order_by(Match.compatibility_score.desc())
    ).all()
    return [
        {
            "id": m.id,
            "waste_record_id": m.waste_record_id,
            "facility_id": m.facility_id,
            "facility_name": facility_name,
            "compatibility_score": m.compatibility_score,
            "distance_km": m.distance_km,
            "estimated_transport_cost": m.estimated_transport_cost,
            "reasons": m.reasons,
            "status": m.status,
            "created_at": m.created_at,
        }
        for m, facility_name in rows
    ]
