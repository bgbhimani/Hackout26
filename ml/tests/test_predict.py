"""
Tests for the trained forecasting pipeline: training data shape, feature
engineering correctness, and prediction output format. Uses the actual
saved model artifacts in ml/models/ (run `python train.py` first if they
don't exist) rather than mocking the model - a mock would not have caught
the real grouped-rolling-average leakage bug found during development
(see docs/ml.md).
"""
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from predict import encode_category, predict_waste_quantity, season_from_month  # noqa: E402
from train import build_features, load_panel  # noqa: E402


def test_season_from_month_matches_gujarat_crop_calendar():
    assert season_from_month(7) == "KHARIF"  # monsoon sowing
    assert season_from_month(10) == "KHARIF"  # paddy harvest
    assert season_from_month(11) == "RABI"  # wheat sowing begins
    assert season_from_month(3) == "RABI"  # wheat harvest
    assert season_from_month(4) == "ZAID"
    assert season_from_month(5) == "ZAID"


def test_every_month_has_exactly_one_season():
    seasons = {season_from_month(m) for m in range(1, 13)}
    assert seasons == {"KHARIF", "RABI", "ZAID"}


def test_encode_category_unknown_value_degrades_to_minus_one():
    """A forecast request for a district/type combination the model never
    saw during training should not crash - see predict.py's docstring."""
    assert encode_category("district", "Atlantis") == -1


def test_encode_category_known_value_is_stable():
    code_a = encode_category("waste_type", "RICE_STRAW")
    code_b = encode_category("waste_type", "RICE_STRAW")
    assert code_a == code_b
    assert code_a != -1


def test_predict_output_format():
    result = predict_waste_quantity(
        waste_type="RICE_STRAW",
        generator_type="FARM",
        district="Kheda",
        season="KHARIF",
        month=10,
        previous_quantity=250.0,
        rolling_avg_3=245.0,
    )
    assert set(result.keys()) == {"predicted_quantity_tonnes", "confidence", "model"}
    assert isinstance(result["predicted_quantity_tonnes"], float)
    assert result["predicted_quantity_tonnes"] >= 0  # a negative forecast is never meaningful
    assert 0.0 <= result["confidence"] <= 1.0
    assert result["model"] == "XGBoost"


def test_predict_never_returns_negative_even_for_implausible_input():
    result = predict_waste_quantity(
        waste_type="RICE_STRAW",
        generator_type="FARM",
        district="Kheda",
        season="ZAID",  # rice straw is never actually available in this season
        month=5,
        previous_quantity=0.0,
        rolling_avg_3=0.0,
    )
    assert result["predicted_quantity_tonnes"] >= 0


# --- Training pipeline: data shape and the leakage-bug regression guard -----


@pytest.fixture(scope="module")
def raw_panel():
    return load_panel()


def test_load_panel_has_expected_columns(raw_panel):
    expected = {"generator_id", "generator_name", "district", "generator_type", "waste_type", "year", "month", "quantity_tonnes"}
    assert expected.issubset(set(raw_panel.columns))


def test_load_panel_drops_non_positive_quantities(raw_panel):
    assert (raw_panel["quantity_tonnes"] > 0).all()


def test_build_features_drops_rows_with_no_prior_history(raw_panel):
    featured = build_features(raw_panel)
    assert featured["previous_quantity"].notna().all()
    assert featured["rolling_avg_3"].notna().all()


def test_rolling_average_does_not_leak_across_generator_boundaries():
    """Regression test for the exact bug found during Phase 7 development:
    chaining .shift(1).rolling(3) directly on a groupby() result computes
    the window globally, bleeding one series' tail into the next series'
    opening value. See docs/ml.md for the full writeup."""
    df = pd.DataFrame(
        {
            "generator_id": ["a", "a", "a", "b", "b", "b"],
            "waste_type": ["RICE_STRAW"] * 6,
            "year": [2020, 2020, 2020, 2020, 2020, 2020],
            "month": [1, 2, 3, 1, 2, 3],
            "quantity_tonnes": [1.0, 2.0, 3.0, 100.0, 200.0, 300.0],
            "district": ["Kheda"] * 6,
            "generator_type": ["FARM"] * 6,
        }
    )
    featured = build_features(df)
    first_row_of_group_b = featured[featured["generator_id"] == "b"].iloc[0]
    # Group b's first row has no prior history of its own - if this is
    # anything other than NaN (dropped by build_features), group a's tail
    # values leaked across the boundary.
    assert first_row_of_group_b["month"] == 2  # month 1 was dropped (no prior history)
