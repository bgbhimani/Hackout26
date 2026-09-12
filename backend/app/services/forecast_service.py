"""
Builds real features from live data (recent actual waste_records) and hands
them to ml/predict.py for inference - this module owns "what happened
recently", ml/predict.py owns "what the model does with that". Neither
retrains nor reloads the model per call; ml/predict.py loads it once at
import time (see that module's docstring).
"""
import sys
import uuid
from datetime import date
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.enums import WasteType
from app.models.forecast import Forecast
from app.models.waste_generator import WasteGenerator
from app.models.waste_record import WasteRecord
from app.schemas.forecast import ForecastRequest, ForecastResponse

# The ml/ package lives at the project root, a sibling of backend/, not
# inside it - this is the one place that boundary is bridged. See
# docs/ml.md for why training code and the API deliberately live in
# separate top-level packages rather than duplicating model logic in both.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from ml.predict import predict_waste_quantity, season_from_month  # noqa: E402


def _recent_history(db: Session, generator_id: uuid.UUID, waste_type: WasteType, limit: int = 6) -> list[float]:
    """Most recent known quantities for this generator+waste_type, newest
    first - used to build the previous_quantity/rolling_avg_3 features the
    model was trained on. Real quantities from the live waste_records
    table, not training data."""
    rows = db.scalars(
        select(WasteRecord.quantity_tonnes)
        .where(WasteRecord.generator_id == generator_id, WasteRecord.waste_type == waste_type)
        .order_by(WasteRecord.available_from.desc())
        .limit(limit)
    ).all()
    return [float(q) for q in rows]


def generate_forecast(db: Session, req: ForecastRequest) -> ForecastResponse:
    generator = db.get(WasteGenerator, req.generator_id)
    if generator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste generator not found")

    history = _recent_history(db, req.generator_id, req.waste_type)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"No historical {req.waste_type.value} records exist for {generator.name} - "
                "a forecast needs at least one prior data point to build on."
            ),
        )

    previous_quantity = history[0]
    rolling_avg_3 = sum(history[:3]) / len(history[:3])

    forecast_year, forecast_month_num = (int(p) for p in req.forecast_month.split("-"))
    season = season_from_month(forecast_month_num)

    prediction = predict_waste_quantity(
        waste_type=req.waste_type.value,
        generator_type=generator.generator_type.value,
        district=_infer_district(generator.address),
        season=season,
        month=forecast_month_num,
        previous_quantity=previous_quantity,
        rolling_avg_3=rolling_avg_3,
    )

    db.add(
        Forecast(
            generator_id=req.generator_id,
            waste_type=req.waste_type,
            forecast_date=date(forecast_year, forecast_month_num, 1),
            predicted_quantity_tonnes=prediction["predicted_quantity_tonnes"],
            confidence=prediction["confidence"],
            model_name=prediction["model"],
        )
    )
    db.commit()

    return ForecastResponse(**prediction)


def _infer_district(address: str) -> str:
    """Seeded generator addresses are literally "<District> District,
    Gujarat" (see seed_demo_data.py) - this is a pragmatic parse of that
    fixed format, not a general address parser. A real deployment would
    store district as its own column; documented here as a known MVP
    simplification rather than hidden."""
    return address.split(" District")[0].strip()


def get_forecast_history(db: Session, generator_id: uuid.UUID) -> list[Forecast]:
    return list(
        db.scalars(
            select(Forecast).where(Forecast.generator_id == generator_id).order_by(Forecast.forecast_date.desc())
        )
    )
