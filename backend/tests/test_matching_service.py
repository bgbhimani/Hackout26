"""
Pure unit tests for the matching engine's scoring math - no database. These
exercise the exact formulas documented in app/services/matching_service.py
and app/constants/matching_config.py.
"""
from app.constants.matching_config import MATCHING_WEIGHTS, MAX_MATCHING_DISTANCE_KM
from app.services.matching_service import (
    _build_reasons,
    _capacity_score,
    _distance_score,
    _utilization_score,
)


def test_matching_weights_sum_to_one():
    """If this ever drifts, every match_score silently stops being a
    0-100 blend and becomes meaningless - this is the one invariant the
    whole scoring system depends on."""
    assert abs(sum(MATCHING_WEIGHTS.values()) - 1.0) < 1e-9


def test_distance_score_at_zero_km_is_perfect():
    assert _distance_score(0) == 100.0


def test_distance_score_at_max_distance_is_zero():
    assert _distance_score(MAX_MATCHING_DISTANCE_KM) == 0.0


def test_distance_score_beyond_max_is_clamped_not_negative():
    assert _distance_score(MAX_MATCHING_DISTANCE_KM * 2) == 0.0


def test_distance_score_is_linear_at_midpoint():
    assert _distance_score(MAX_MATCHING_DISTANCE_KM / 2) == 50.0


def test_capacity_score_full_when_ample_capacity():
    assert _capacity_score(available_capacity_tonnes=100, quantity_tonnes=20) == 100.0


def test_capacity_score_exact_fit_is_full_credit():
    assert _capacity_score(available_capacity_tonnes=20, quantity_tonnes=20) == 100.0


def test_capacity_score_partial_credit_when_short():
    # 50 available for 100 needed = 50% partial credit, not zero -
    # a facility that can take half the load is more useful than one that can't help at all.
    assert _capacity_score(available_capacity_tonnes=50, quantity_tonnes=100) == 50.0


def test_capacity_score_zero_when_no_capacity():
    assert _capacity_score(available_capacity_tonnes=0, quantity_tonnes=100) == 0.0


def test_utilization_score_inverts_utilization():
    assert _utilization_score(0) == 100.0
    assert _utilization_score(100) == 0.0
    assert _utilization_score(30) == 70.0


def test_utilization_score_never_negative():
    # Defensive: utilization_percent should never exceed 100 in practice,
    # but the score function must not produce a negative score if it does.
    assert _utilization_score(150) == 0.0


def test_reasons_flag_insufficient_capacity_honestly():
    reasons = _build_reasons(
        distance_km=10, available_capacity_tonnes=40, quantity_tonnes=100, utilization_percent=50
    )
    assert any("Limited capacity" in r for r in reasons)
    assert not any("Sufficient capacity" in r for r in reasons)


def test_reasons_confirm_sufficient_capacity():
    reasons = _build_reasons(
        distance_km=10, available_capacity_tonnes=200, quantity_tonnes=100, utilization_percent=50
    )
    assert "Sufficient capacity" in reasons


def test_reasons_flag_long_distance():
    reasons = _build_reasons(
        distance_km=MAX_MATCHING_DISTANCE_KM * 0.9,
        available_capacity_tonnes=200,
        quantity_tonnes=100,
        utilization_percent=50,
    )
    assert "Long transport distance" in reasons
