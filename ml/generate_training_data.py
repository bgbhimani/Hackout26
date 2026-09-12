"""
Builds the historical training panel the forecasting model is trained on.

This is DELIBERATELY a separate dataset from the live `waste_records` table
(which only covers 2025, the "current" demo year shown on the Dashboard/Map/
Matching/Routes pages). A forecasting model needs multiple years of history
to learn a lag/rolling-average pattern - one year per generator isn't enough
for a genuine time-based train/test split, so this script extends the SAME
research-grounded generator archetypes and calibration constants used by
backend/scripts/seed_demo_data.py (dairy yield, crop RPR, CPCB per-capita
rates - all cited in data/ml-data-research.md) backwards across six years
(2020-2025), with realistic year-to-year drift on top of the same seasonal
pattern.

Output: ml/data/historical_waste_panel.csv - labelled "Demo / Synthetic Data"
everywhere it is used, per the project's data-honesty requirement.

Usage: python generate_training_data.py   (run from the ml/ directory)
"""
import csv
import random
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from scripts.seed_demo_data import GENERATORS, DISTRICT_CENTRES, jitter  # noqa: E402

random.seed(7)  # different seed from seed_demo_data.py's 42 - independent draw, still reproducible

YEARS = [2020, 2021, 2022, 2023, 2024, 2025]
OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "historical_waste_panel.csv"


def slugify(name: str) -> str:
    return name.lower().replace(" ", "_").replace("-", "_").replace(",", "")


def main() -> None:
    rows = []

    for spec in GENERATORS:
        generator_slug = slugify(spec.name)
        centre_lat, centre_lng = DISTRICT_CENTRES[spec.district]
        # One fixed location per generator (real generators don't move) -
        # jittered the same way seed_demo_data.py places live demo markers.
        lat, lng = jitter(centre_lat, centre_lng)

        for waste_type, base_monthly_tonnes, months in spec.waste_profile:
            active_months = months if months is not None else list(range(1, 13))

            # A slow, realistic year-over-year drift (e.g. gradual herd growth,
            # slowly changing cropped area) rather than a flat repeat of the
            # same number every year - a model trained on a perfectly flat
            # series would learn nothing from the lag/rolling features.
            year_multiplier = 1.0
            for year in YEARS:
                year_multiplier *= random.uniform(0.97, 1.05)  # -3%/+5% drift per year, compounding

                for month in active_months:
                    month_noise = random.uniform(0.85, 1.15)
                    quantity = round(base_monthly_tonnes * year_multiplier * month_noise, 1)
                    rows.append(
                        {
                            "generator_id": generator_slug,
                            "generator_name": spec.name,
                            "district": spec.district,
                            "generator_type": spec.generator_type.value,
                            "latitude": lat,
                            "longitude": lng,
                            "waste_type": waste_type.value,
                            "year": year,
                            "month": month,
                            "quantity_tonnes": quantity,
                        }
                    )

    rows.sort(key=lambda r: (r["generator_id"], r["waste_type"], r["year"], r["month"]))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows spanning {YEARS[0]}-{YEARS[-1]} to {OUTPUT_PATH}")
    print("Demo / Synthetic Data - calibrated against real research, see data/ml-data-research.md")


if __name__ == "__main__":
    main()
