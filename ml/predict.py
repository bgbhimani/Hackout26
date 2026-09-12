"""
Pure model-inference module. Models are loaded ONCE at import time (not per
call, and definitely not retrained per call - see the "no fake features"
requirement) and reused for every prediction. This module knows nothing
about FastAPI, the database, or HTTP - it takes already-computed features in
and returns a prediction. Building those features from live/recent data is
backend/app/services/forecast_service.py's job, which keeps this module
testable and reusable on its own.

CONFIDENCE, HONESTLY EXPLAINED: XGBoost's point prediction has no native
probability. Rather than fabricate a number, confidence here is a REAL
signal: the Random Forest baseline is an ensemble of many trees, each of
which votes independently on the input - when the trees agree closely, the
forecast is sitting somewhere the model has seen consistent patterns for;
when they disagree widely, the forecast is a genuine extrapolation. We
convert that per-tree standard deviation into a 0-1 confidence score. It is
a real, inspectable signal, not a guess - and it is explicitly labelled as
an estimate, never as a probability of correctness.
"""
import json
from pathlib import Path

import joblib
import numpy as np

import sys as _sys

_sys.path.insert(0, str(Path(__file__).resolve().parent))
# re-exported here so callers need one import (from ml.predict), not two
from train import season_from_month  # noqa: E402

MODELS_DIR = Path(__file__).resolve().parent / "models"

_xgb_model = joblib.load(MODELS_DIR / "xgboost_model.joblib")
_rf_model = joblib.load(MODELS_DIR / "random_forest_model.joblib")
_encoders = joblib.load(MODELS_DIR / "encoders.joblib")
_feature_columns: list[str] = json.loads((MODELS_DIR / "feature_columns.json").read_text())["columns"]


def encode_category(column: str, value: str) -> int:
    """Encodes a raw category (e.g. waste_type="RICE_STRAW") using the exact
    LabelEncoder fitted during training - never fits a new one at inference
    time, which would silently assign different integer codes than the
    model was trained on. Unseen categories are mapped to -1 rather than
    raising, since a forecast request for a new district/waste_type
    combination should degrade gracefully, not 500."""
    encoder = _encoders[column]
    if value in encoder.classes_:
        return int(encoder.transform([value])[0])
    return -1


def _rf_confidence(feature_row: list[float]) -> float:
    """Std across every tree's individual prediction, converted to a 0-1
    confidence score: 0 spread -> confidence 1.0, spread >= 40% of the
    predicted value -> confidence floors at 0.5 (a forecast is still a
    forecast, never reported as fully unreliable)."""
    x = np.array(feature_row).reshape(1, -1)
    tree_predictions = np.array([tree.predict(x)[0] for tree in _rf_model.estimators_])
    mean_pred = tree_predictions.mean()
    if mean_pred <= 0:
        return 0.5
    relative_spread = tree_predictions.std() / mean_pred
    confidence = 1.0 - min(relative_spread / 0.4, 1.0) * 0.5
    return round(float(confidence), 3)


def predict_waste_quantity(
    *,
    waste_type: str,
    generator_type: str,
    district: str,
    season: str,
    month: int,
    previous_quantity: float,
    rolling_avg_3: float,
) -> dict:
    """Returns {"predicted_quantity_tonnes", "confidence", "model"}. Feature
    order MUST match FEATURE_COLUMNS in train.py - built from the saved
    feature_columns.json rather than hardcoded here so the two can never
    silently drift apart."""
    encoded = {
        "waste_type_enc": encode_category("waste_type", waste_type),
        "generator_type_enc": encode_category("generator_type", generator_type),
        "district_enc": encode_category("district", district),
        "season_enc": encode_category("season", season),
        "month": month,
        "previous_quantity": previous_quantity,
        "rolling_avg_3": rolling_avg_3,
    }
    feature_row = [encoded[col] for col in _feature_columns]

    predicted_quantity = float(_xgb_model.predict(np.array(feature_row).reshape(1, -1))[0])
    predicted_quantity = max(0.0, round(predicted_quantity, 1))  # a negative forecast is never meaningful
    confidence = _rf_confidence(feature_row)

    return {"predicted_quantity_tonnes": predicted_quantity, "confidence": confidence, "model": "XGBoost"}
