"""
ML pipeline: Historical Data -> Data Cleaning -> Feature Engineering ->
Time-based Split -> Random Forest Baseline -> XGBoost -> Evaluation ->
Save Model.

Trains on ml/data/historical_waste_panel.csv (see generate_training_data.py
for exactly how that data is built and what in it is real vs. calibrated-
synthetic). Run from the ml/ directory: `python train.py`.
"""
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor

from evaluate import evaluate_model

DATA_PATH = Path(__file__).resolve().parent / "data" / "historical_waste_panel.csv"
MODELS_DIR = Path(__file__).resolve().parent / "models"

CATEGORICAL_COLUMNS = ["waste_type", "generator_type", "district", "season"]
FEATURE_COLUMNS = [
    "waste_type_enc",
    "generator_type_enc",
    "district_enc",
    "season_enc",
    "month",
    "previous_quantity",
    "rolling_avg_3",
]
TARGET_COLUMN = "quantity_tonnes"

# Time-based split cutoff: train on everything before 2025, test on 2025.
# A RANDOM split would leak future values into training via shuffled rows
# from the same generator/waste_type series - see the model card in
# docs/ml.md for why that specific mistake is called out explicitly.
TEST_YEAR = 2025


def _season_from_month(month: int) -> str:
    """Indian agricultural seasons - matches the real Gujarat crop calendar
    documented in data/ml-data-research.md (Kharif sowing Jun-Jul, harvest
    into Oct; Rabi sowing Oct-Dec, harvest Mar-Apr)."""
    if month in (6, 7, 8, 9, 10):
        return "KHARIF"
    if month in (11, 12, 1, 2, 3):
        return "RABI"
    return "ZAID"  # Apr-May, the short summer season


def load_panel() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)

    # --- Data cleaning -----------------------------------------------------
    before = len(df)
    df = df.dropna(subset=["quantity_tonnes", "waste_type", "generator_id"])
    df = df[df["quantity_tonnes"] > 0]
    dropped = before - len(df)
    if dropped:
        print(f"Data cleaning: dropped {dropped} invalid/missing row(s)")

    return df


def build_features(df: pd.DataFrame, encoders: dict[str, LabelEncoder] | None = None) -> pd.DataFrame:
    """Adds season, lag, and rolling-average features, and label-encodes
    every categorical column. If `encoders` is provided (inference time),
    reuses them instead of fitting new ones - fitting fresh encoders on
    live/prediction-time data would silently assign different integer codes
    than training used, corrupting every downstream prediction."""
    df = df.copy()
    df["season"] = df["month"].apply(_season_from_month)

    # Lag/rolling features, computed per generator+waste_type series, sorted
    # chronologically. shift(1) happens BEFORE rolling() - rolling on the
    # unshifted column would let the current month's own value leak into its
    # own "recent average" feature, which is exactly the kind of leakage
    # that makes a backtest look great and a real forecast fail.
    df = df.sort_values(["generator_id", "waste_type", "year", "month"])
    group_key = ["generator_id", "waste_type"]
    df["previous_quantity"] = df.groupby(group_key)["quantity_tonnes"].shift(1)
    # .transform() (not chaining .shift().rolling() on the GroupBy result)
    # is required here - shift() on a SeriesGroupBy returns a plain Series,
    # so a rolling() chained directly onto it would compute the window
    # globally and bleed values across generator/waste_type boundaries.
    # Verified empirically: without .transform(), the first row of every
    # new group picks up a contaminated average from the previous group's
    # tail instead of NaN.
    df["rolling_avg_3"] = df.groupby(group_key)["quantity_tonnes"].transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).mean()
    )

    # First occurrence of each generator+waste_type series has no prior
    # history - cannot be given a real lag feature, so it cannot be used
    # for training or evaluation (backfilling with 0 would just teach the
    # model a fake pattern).
    df = df.dropna(subset=["previous_quantity", "rolling_avg_3"])

    fitted_encoders: dict[str, LabelEncoder] = {}
    for col in CATEGORICAL_COLUMNS:
        if encoders is not None:
            enc = encoders[col]
            df[f"{col}_enc"] = enc.transform(df[col])
        else:
            enc = LabelEncoder()
            df[f"{col}_enc"] = enc.fit_transform(df[col])
            fitted_encoders[col] = enc

    if encoders is None:
        df.attrs["fitted_encoders"] = fitted_encoders
    return df


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    df = load_panel()
    df = build_features(df)
    encoders: dict[str, LabelEncoder] = df.attrs["fitted_encoders"]

    train_df = df[df["year"] < TEST_YEAR]
    test_df = df[df["year"] == TEST_YEAR]
    print(f"Time-based split: {len(train_df)} train rows (years < {TEST_YEAR}), "
          f"{len(test_df)} test rows (year = {TEST_YEAR})")

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TARGET_COLUMN]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TARGET_COLUMN]

    # --- Baseline: Random Forest --------------------------------------------
    rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_metrics = evaluate_model(rf, X_test, y_test, "Random Forest (baseline)")

    # --- Final model: XGBoost ------------------------------------------------
    xgb = XGBRegressor(
        n_estimators=300, learning_rate=0.05, max_depth=4, subsample=0.9, colsample_bytree=0.9, random_state=42
    )
    xgb.fit(X_train, y_train)
    xgb_metrics = evaluate_model(xgb, X_test, y_test, "XGBoost (final)")

    winner = "XGBoost" if xgb_metrics["mae"] <= rf_metrics["mae"] else "Random Forest"
    print(f"\nLower test MAE: {winner}")

    # --- Save everything the API needs at inference time --------------------
    joblib.dump(rf, MODELS_DIR / "random_forest_model.joblib")
    joblib.dump(xgb, MODELS_DIR / "xgboost_model.joblib")
    joblib.dump(encoders, MODELS_DIR / "encoders.joblib")
    (MODELS_DIR / "feature_columns.json").write_text(json.dumps({"columns": FEATURE_COLUMNS}, indent=2))
    (MODELS_DIR / "metrics.json").write_text(
        json.dumps(
            {
                "trained_at_rows": {"train": len(train_df), "test": len(test_df)},
                "test_year": TEST_YEAR,
                "random_forest": rf_metrics,
                "xgboost": xgb_metrics,
                "winner_by_mae": winner,
            },
            indent=2,
        )
    )
    print(f"\nSaved models, encoders, and metrics to {MODELS_DIR}")


if __name__ == "__main__":
    main()
