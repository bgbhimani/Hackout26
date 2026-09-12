"""
Transparent, weighted facility-matching engine. This is explicitly NOT
described as AI - it's a documented scoring formula over real data, and
every score is explainable via ScoreBreakdown + the reasons list. See
app/constants/matching_config.py for every weight and threshold used here.

SCORING (per waste record, against each ACTIVE facility that accepts its
waste type and is within MAX_CANDIDATE_DISTANCE_KM):
  1. Compatibility (40%) - binary gate: only facilities whose
     accepted_waste_types include this waste_type are considered at all,
     so among returned candidates this is always 100.
  2. Distance (25%) - real PostGIS ST_Distance (geography, so it's an
     accurate geodesic distance in metres, not a flat-earth approximation),
     linearly scored from 100 at 0km down to 0 at MAX_MATCHING_DISTANCE_KM.
     Candidates beyond MAX_CANDIDATE_DISTANCE_KM are dropped entirely rather
     than merely floored to a 0 score - a facility on the other side of the
     country (or a generator with a garbled lat/lng) has no business
     appearing in the list at all, however well it scores on the other three
     components.
  3. Capacity (20%) - 100 if the facility's free capacity
     (capacity_tonnes - current_load_tonnes) covers the whole waste
     quantity, otherwise proportional partial credit.
  4. Utilization (15%) - 100 minus the facility's current utilization % -
     an idle facility scores higher than an already-strained one.

REQUEST LIFECYCLE: recommend_facilities() is a pure preview - it persists
nothing. A generator explicitly sends a request (send_request), which is
what actually creates a Match (status REQUESTED) and notifies the facility.
From there either side can accept, reject, or counter (propose different
offer_price/offer_pickup_date) while the match stays REQUESTED/COUNTERED;
Match.last_offer_by always names whoever's terms are currently on the
table, so it's always the OTHER side's turn to respond. Every turn is also
appended to MatchOffer as an immutable thread entry.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import AuthenticatedUser
from app.constants.enums import (
    FacilityStatus,
    MatchStatus,
    OfferAction,
    OfferParty,
    UserRole,
    WasteStatus,
)
from app.constants.matching_config import (
    MATCHING_WEIGHTS,
    MAX_CANDIDATE_DISTANCE_KM,
    MAX_MATCHING_DISTANCE_KM,
    MAX_RECOMMENDATIONS,
    TRANSPORT_COST_PER_TONNE_KM,
)
from app.models.facility import Facility
from app.models.match import Match
from app.models.match_offer import MatchOffer
from app.models.waste_record import WasteRecord
from app.schemas.matching import (
    CounterOfferPayload,
    FacilityRecommendation,
    ScoreBreakdown,
    SendRequestPayload,
)


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


def _score(
    *, distance_km: float, available_capacity_tonnes: float, quantity_tonnes: float, utilization_percent: float
) -> tuple[ScoreBreakdown, float]:
    breakdown = ScoreBreakdown(
        compatibility=100.0,
        distance=round(_distance_score(distance_km), 1),
        capacity=round(_capacity_score(available_capacity_tonnes, quantity_tonnes), 1),
        utilization=round(_utilization_score(utilization_percent), 1),
    )
    final_score = round(
        breakdown.compatibility * MATCHING_WEIGHTS["compatibility"]
        + breakdown.distance * MATCHING_WEIGHTS["distance"]
        + breakdown.capacity * MATCHING_WEIGHTS["capacity"]
        + breakdown.utilization * MATCHING_WEIGHTS["utilization"],
        1,
    )
    return breakdown, final_score


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
    elif distance_km <= MAX_MATCHING_DISTANCE_KM:
        reasons.append("Long transport distance")
    else:
        reasons.append("Well beyond the normal collection range")

    if utilization_percent < 50:
        reasons.append("Low facility utilization")
    elif utilization_percent > 80:
        reasons.append("High facility utilization")

    return reasons


def _distance_km_expr(generator_lat: float, generator_lng: float):
    origin_wkt = f"POINT({generator_lng} {generator_lat})"
    return func.ST_Distance(func.ST_GeogFromText(origin_wkt), Facility.location) / 1000.0


def recommend_facilities(db: Session, waste_record_id: uuid.UUID) -> list[FacilityRecommendation]:
    """A read-only preview - never persists a Match. Sending an actual
    request to a facility is a separate, explicit action (see send_request)."""
    waste_record = db.get(WasteRecord, waste_record_id, options=[joinedload(WasteRecord.generator)])
    if waste_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")

    generator = waste_record.generator
    distance_km_expr = _distance_km_expr(generator.latitude, generator.longitude)

    rows = db.execute(
        select(Facility, distance_km_expr.label("distance_km"))
        .where(
            Facility.status == FacilityStatus.ACTIVE,
            Facility.accepted_waste_types.any(waste_record.waste_type),
            distance_km_expr <= MAX_CANDIDATE_DISTANCE_KM,
        )
        .order_by(distance_km_expr)
    ).all()

    # If a request has already been sent to some of these facilities for this
    # waste record, surface its real status/id instead of a plain preview -
    # a card the generator already acted on must never look actionable again.
    existing_by_facility = {
        m.facility_id: m
        for m in db.scalars(select(Match).where(Match.waste_record_id == waste_record_id)).all()
    }

    recommendations: list[FacilityRecommendation] = []
    for facility, distance_km in rows:
        distance_km = float(distance_km)
        available_capacity = float(facility.capacity_tonnes) - float(facility.current_load_tonnes)
        quantity = float(waste_record.quantity_tonnes)

        breakdown, final_score = _score(
            distance_km=distance_km,
            available_capacity_tonnes=available_capacity,
            quantity_tonnes=quantity,
            utilization_percent=facility.utilization_percent,
        )
        existing = existing_by_facility.get(facility.id)

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
                match_id=existing.id if existing else None,
                match_status=existing.status if existing else None,
            )
        )

    recommendations.sort(key=lambda r: r.match_score, reverse=True)
    return recommendations[:MAX_RECOMMENDATIONS]


def send_request(db: Session, payload: SendRequestPayload, generator_user: AuthenticatedUser) -> Match:
    """The explicit "Send Request" action - this is what actually creates a
    Match and puts it in the facility operator's inbox. Everything scoring-
    related is recomputed fresh here rather than trusted from whatever the
    client last saw from /recommend, so a stale quantity or a facility whose
    load changed in the meantime can't be smuggled in as truth."""
    # Deliberately not restricted to waste records generator_user's own
    # WasteGenerator entity owns - the waste-record picker (frontend) is a
    # network-wide view of every AVAILABLE record, and any authenticated
    # Waste Generator is allowed to broker a request for any of them, not
    # only ones tied to their own account. See matching/page.tsx.
    waste_record = db.get(WasteRecord, payload.waste_record_id, options=[joinedload(WasteRecord.generator)])
    if waste_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")

    facility = db.get(Facility, payload.facility_id)
    if facility is None or facility.status != FacilityStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    if not any(wt == waste_record.waste_type for wt in facility.accepted_waste_types):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This facility does not accept this waste type",
        )

    already_in_flight = db.scalar(
        select(Match).where(
            Match.waste_record_id == waste_record.id,
            Match.facility_id == facility.id,
            Match.status.in_([MatchStatus.REQUESTED, MatchStatus.COUNTERED, MatchStatus.ACCEPTED]),
        )
    )
    if already_in_flight is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A request already exists for this facility ({already_in_flight.status.value})",
        )

    distance_km = float(
        db.scalar(select(_distance_km_expr(waste_record.generator.latitude, waste_record.generator.longitude)).where(Facility.id == facility.id))
    )
    quantity = float(waste_record.quantity_tonnes)
    available_capacity = float(facility.capacity_tonnes) - float(facility.current_load_tonnes)
    _breakdown, final_score = _score(
        distance_km=distance_km,
        available_capacity_tonnes=available_capacity,
        quantity_tonnes=quantity,
        utilization_percent=facility.utilization_percent,
    )

    match = Match(
        waste_record_id=waste_record.id,
        facility_id=facility.id,
        compatibility_score=final_score,
        distance_km=round(distance_km, 1),
        estimated_transport_cost=round(distance_km * TRANSPORT_COST_PER_TONNE_KM * quantity, 2),
        reasons=_build_reasons(
            distance_km=distance_km,
            available_capacity_tonnes=available_capacity,
            quantity_tonnes=quantity,
            utilization_percent=facility.utilization_percent,
        ),
        status=MatchStatus.REQUESTED,
        last_offer_by=OfferParty.GENERATOR,
        offer_price=payload.offer_price,
        offer_pickup_date=payload.offer_pickup_date,
        offer_note=payload.note,
        offer_round=1,
    )
    db.add(match)
    db.flush()  # populate match.id before the MatchOffer FK needs it
    db.add(
        MatchOffer(
            match_id=match.id,
            offered_by=OfferParty.GENERATOR,
            action=OfferAction.REQUEST,
            offer_price=payload.offer_price,
            offer_pickup_date=payload.offer_pickup_date,
            note=payload.note,
        )
    )
    db.commit()
    db.refresh(match)
    return match


def _is_negotiable(current_status: MatchStatus) -> bool:
    """A match can only be responded to while REQUESTED or COUNTERED -
    re-deciding an already-ACCEPTED/REJECTED/WITHDRAWN match is rejected
    with a 422 rather than silently overwritten."""
    return current_status in (MatchStatus.REQUESTED, MatchStatus.COUNTERED)


def _actor_party(match: Match, user: AuthenticatedUser) -> OfferParty:
    """Which side of this negotiation the caller is - resolved by ownership,
    not role alone, so a Facility Operator can't act on someone else's
    facility's match and a Waste Generator can't act on someone else's
    waste record. Deliberately 404s either way: confirms nothing about a
    match the caller isn't part of."""
    if match.facility.user_id == user.id:
        return OfferParty.FACILITY
    if match.waste_record.generator.user_id == user.id:
        return OfferParty.GENERATOR
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")


def _load_match_for_negotiation(db: Session, match_id: uuid.UUID, user: AuthenticatedUser) -> tuple[Match, OfferParty]:
    match = db.get(
        Match,
        match_id,
        options=[joinedload(Match.facility), joinedload(Match.waste_record).joinedload(WasteRecord.generator)],
    )
    if match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return match, _actor_party(match, user)


def _require_negotiable(match: Match) -> None:
    if not _is_negotiable(match.status):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Match is already {match.status.value}, no further action possible",
        )


def _require_others_turn(match: Match, party: OfferParty) -> None:
    """Accept/reject/counter always respond to the OTHER side's last offer -
    you can't accept, reject, or re-counter your own still-outstanding
    offer. Withdraw is exempt from this (see withdraw_request)."""
    if match.last_offer_by == party:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Waiting for the other party to respond to your last offer",
        )


def _log_offer(
    db: Session,
    match: Match,
    party: OfferParty,
    action: OfferAction,
    *,
    offer_price: float | None = None,
    offer_pickup_date=None,
    note: str | None = None,
) -> None:
    db.add(
        MatchOffer(
            match_id=match.id,
            offered_by=party,
            action=action,
            offer_price=offer_price,
            offer_pickup_date=offer_pickup_date,
            note=note,
        )
    )


def accept_match(db: Session, match_id: uuid.UUID, user: AuthenticatedUser) -> Match:
    """Either side can accept the other's outstanding offer. Side effects,
    in order:
      1. This match -> ACCEPTED.
      2. Every OTHER still-active (REQUESTED/COUNTERED) match for the same
         waste record is auto-REJECTED - a waste record can only be accepted
         at one facility at a time, otherwise route_service.optimize_route
         would have no way to know which facility legitimately owns it.
      3. The waste record itself -> PENDING (reserved for pickup), but only
         if it's still AVAILABLE - if something else already moved it on
         (e.g. a race with another accept), fail loudly instead of silently
         overwriting a real state transition.
    """
    match, party = _load_match_for_negotiation(db, match_id, user)
    _require_negotiable(match)
    _require_others_turn(match, party)

    if match.waste_record.status != WasteStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Waste record is already {match.waste_record.status.value}, cannot accept",
        )

    match.status = MatchStatus.ACCEPTED
    match.waste_record.status = WasteStatus.PENDING
    _log_offer(
        db, match, party, OfferAction.ACCEPT,
        offer_price=match.offer_price, offer_pickup_date=match.offer_pickup_date, note=match.offer_note,
    )

    siblings = db.scalars(
        select(Match).where(
            Match.waste_record_id == match.waste_record_id,
            Match.status.in_([MatchStatus.REQUESTED, MatchStatus.COUNTERED]),
            Match.id != match.id,
        )
    ).all()
    for sibling in siblings:
        sibling.status = MatchStatus.REJECTED

    db.commit()
    db.refresh(match)
    return match


def reject_match(db: Session, match_id: uuid.UUID, user: AuthenticatedUser) -> Match:
    """The waste record is left exactly as it was (AVAILABLE) - rejecting a
    match must never affect the generator's ability to be matched elsewhere."""
    match, party = _load_match_for_negotiation(db, match_id, user)
    _require_negotiable(match)
    _require_others_turn(match, party)

    match.status = MatchStatus.REJECTED
    _log_offer(db, match, party, OfferAction.REJECT)
    db.commit()
    db.refresh(match)
    return match


def counter_offer(db: Session, match_id: uuid.UUID, user: AuthenticatedUser, payload: CounterOfferPayload) -> Match:
    """Propose different terms. Flips whose turn it is - the other side must
    now accept, reject, or counter back."""
    match, party = _load_match_for_negotiation(db, match_id, user)
    _require_negotiable(match)
    _require_others_turn(match, party)

    match.status = MatchStatus.COUNTERED
    match.last_offer_by = party
    match.offer_price = payload.offer_price
    match.offer_pickup_date = payload.offer_pickup_date
    match.offer_note = payload.note
    match.offer_round += 1
    _log_offer(
        db, match, party, OfferAction.COUNTER,
        offer_price=payload.offer_price, offer_pickup_date=payload.offer_pickup_date, note=payload.note,
    )
    db.commit()
    db.refresh(match)
    return match


def withdraw_request(db: Session, match_id: uuid.UUID, user: AuthenticatedUser) -> Match:
    """Only the requesting generator can withdraw - and can do so regardless
    of whose turn it is, since this isn't a response to the other side's
    offer, it's cancelling the ask altogether."""
    match, party = _load_match_for_negotiation(db, match_id, user)
    if party != OfferParty.GENERATOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the requesting generator can withdraw a request")
    _require_negotiable(match)

    match.status = MatchStatus.WITHDRAWN
    _log_offer(db, match, party, OfferAction.WITHDRAW)
    db.commit()
    db.refresh(match)
    return match


def get_offers_for_match(db: Session, match_id: uuid.UUID, user: AuthenticatedUser) -> list[MatchOffer]:
    match, _party = _load_match_for_negotiation(db, match_id, user)
    return list(match.offers)


def _to_negotiation_out(m: Match, facility_name: str, *, viewer: OfferParty) -> dict:
    return {
        "id": m.id,
        "waste_record_id": m.waste_record_id,
        "facility_id": m.facility_id,
        "facility_name": facility_name,
        "facility_type": m.facility.facility_type,
        "compatibility_score": m.compatibility_score,
        "distance_km": m.distance_km,
        "estimated_transport_cost": m.estimated_transport_cost,
        "reasons": m.reasons,
        "status": m.status,
        "last_offer_by": m.last_offer_by,
        "offer_price": m.offer_price,
        "offer_pickup_date": m.offer_pickup_date,
        "offer_note": m.offer_note,
        "offer_round": m.offer_round,
        "created_at": m.created_at,
        "waste_type": m.waste_record.waste_type,
        "quantity_tonnes": m.waste_record.quantity_tonnes,
        "generator_name": m.waste_record.generator.name,
        "can_respond": _is_negotiable(m.status) and m.last_offer_by != viewer,
    }


def get_pending_matches_for_operator(db: Session, user_id: uuid.UUID) -> list[dict]:
    """A Facility Operator's Requests inbox: every REQUESTED/COUNTERED match
    for a facility they operate - including ones they've already countered
    and are waiting on the generator for, so the full negotiation stays
    visible in one place, not just the ones currently actionable."""
    rows = db.execute(
        select(Match, Facility.name.label("facility_name"))
        .join(Facility, Facility.id == Match.facility_id)
        .join(WasteRecord, WasteRecord.id == Match.waste_record_id)
        .where(Facility.user_id == user_id, Match.status.in_([MatchStatus.REQUESTED, MatchStatus.COUNTERED]))
        .order_by(Match.created_at.desc())
        .options(joinedload(Match.waste_record).joinedload(WasteRecord.generator), joinedload(Match.facility))
    ).all()
    return [_to_negotiation_out(m, facility_name, viewer=OfferParty.FACILITY) for m, facility_name in rows]


def get_my_requests_for_generator(db: Session, user_id: uuid.UUID) -> list[dict]:
    """A Waste Generator's My Requests page: every request they've sent,
    across every status, most recent first - active ones need a response or
    show "awaiting facility"; terminal ones (accepted/rejected/withdrawn)
    stay visible as a record of what happened."""
    rows = db.execute(
        select(Match, Facility.name.label("facility_name"))
        .join(Facility, Facility.id == Match.facility_id)
        .join(WasteRecord, WasteRecord.id == Match.waste_record_id)
        .where(WasteRecord.generator.has(user_id=user_id))
        .order_by(Match.created_at.desc())
        .options(joinedload(Match.waste_record).joinedload(WasteRecord.generator), joinedload(Match.facility))
    ).all()
    return [_to_negotiation_out(m, facility_name, viewer=OfferParty.GENERATOR) for m, facility_name in rows]


def get_accepted_matches_for_facility(
    db: Session, facility_id: uuid.UUID, current: AuthenticatedUser
) -> list[dict]:
    """ACCEPTED matches for one facility, still awaiting pickup (waste record
    status PENDING - not yet COLLECTED by a route). This is what the Routes
    page offers a Facility Operator to build a route from - route_service.
    optimize_route independently re-validates ACCEPTED status server-side,
    so this is a UI convenience, not the enforcement point itself.

    ADMIN bypasses the ownership check (consistent with POST /api/routes/
    optimize, which also allows ADMIN to plan a route for any facility) -
    everyone else must actually operate this facility."""
    facility = db.get(Facility, facility_id)
    if facility is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    if current.role != UserRole.ADMIN and facility.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not operate this facility")

    rows = db.execute(
        select(Match, Facility.name.label("facility_name"))
        .join(Facility, Facility.id == Match.facility_id)
        .join(WasteRecord, WasteRecord.id == Match.waste_record_id)
        .where(
            Match.facility_id == facility_id,
            Match.status == MatchStatus.ACCEPTED,
            WasteRecord.status == WasteStatus.PENDING,
        )
        .order_by(Match.created_at.desc())
        .options(joinedload(Match.waste_record).joinedload(WasteRecord.generator), joinedload(Match.facility))
    ).all()
    return [_to_negotiation_out(m, facility_name, viewer=OfferParty.FACILITY) for m, facility_name in rows]


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
            "last_offer_by": m.last_offer_by,
            "offer_price": m.offer_price,
            "offer_pickup_date": m.offer_pickup_date,
            "offer_note": m.offer_note,
            "offer_round": m.offer_round,
            "created_at": m.created_at,
        }
        for m, facility_name in rows
    ]
