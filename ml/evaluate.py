"""
Evaluation metrics for the forecasting models. Kept separate from train.py
per the spec's requested pipeline shape (ml/train.py, ml/evaluate.py,
ml/predict.py) - train.py calls evaluate_model() after fitting; this module
can also be run standalone against already-saved models and a held-out CSV.
"""
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def evaluate_model(model, X_test, y_test, name: str) -> dict:
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
    r2 = r2_score(y_test, predictions)

    print(f"\n{name} - test set performance ({len(y_test)} rows):")
    print(f"  MAE  : {mae:.2f} tonnes")
    print(f"  RMSE : {rmse:.2f} tonnes")
    print(f"  R2   : {r2:.3f}")

    return {"model": name, "mae": round(float(mae), 3), "rmse": round(rmse, 3), "r2": round(float(r2), 3)}


if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path

    import joblib
    import pandas as pd

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from train import build_features, load_panel  # noqa: E402

    models_dir = Path(__file__).resolve().parent / "models"
    df = load_panel()
    df = build_features(df, encoders=joblib.load(models_dir / "encoders.joblib"))
    test_df = df[df["year"] == 2025]

    feature_cols = json.loads((models_dir / "feature_columns.json").read_text())["columns"]
    X_test, y_test = test_df[feature_cols], test_df["quantity_tonnes"]

    for model_file, label in [("random_forest_model.joblib", "Random Forest (reloaded)"),
                               ("xgboost_model.joblib", "XGBoost (reloaded)")]:
        model = joblib.load(models_dir / model_file)
        evaluate_model(model, X_test, y_test, label)
