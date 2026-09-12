# Waste-to-Carbon Value Chain Tracker — Project Overview

**Team:** Gentalmen (4 members) · **Event:** HackOut'26, DAIICT · **Theme:** Circular Carbon Ecosystem
**Status:** All 10 phases complete and verified against a live database. See the phase table below.

This is the single reference document for the whole project: roles, features, database schema, API
surface, algorithms, tech stack, and setup. Deeper detail on specific subsystems lives in the linked docs.

---

## 1. Problem Statement (official)

> Organic and industrial waste that could be converted into biochar, biogas, or carbon-negative materials
> frequently ends up in landfills instead. This problem involves building a platform that connects waste
> generators (farms, food industries, municipalities) with carbon-conversion facilities, optimizes
> collection logistics, and calculates the CO₂ sequestered per ton of waste diverted from landfill.

**Target users:** Municipalities, farms, food/industrial waste generators, biochar/biogas facility operators.

**Expected impact:** Diverts waste from landfills into productive, carbon-negative pathways; provides
measurable CO₂ sequestration data for reporting and incentives; creates new revenue streams for waste
generators and conversion facilities.

## 2. The workflow this platform demonstrates

```
Waste Generator → Waste Data → AI Waste Forecasting → Smart Facility Matching
                                                              ↓
                              Impact Dashboard ← Carbon Impact ← Route Optimization
```

**PREDICT → MATCH → ROUTE → MEASURE** — every feature maps onto exactly one of these four stages; nothing
was built just to pad the feature list.

---

## 3. User Roles & Permissions

Three roles, kept deliberately simple — role determines what a user can *write*, not what they can see
(everyone authenticated can read all data, matching a hackathon-scale MVP rather than building a full
per-row ownership model).

| Role | Can read | Can write |
|---|---|---|
| **ADMIN** | Everything | Generators, waste records, facilities — and the only role that can **delete** a generator |
| **WASTE_GENERATOR** | Everything | Create/update generators and waste records |
| **FACILITY_OPERATOR** | Everything | Create/update facilities |

Authentication is JWT-based (see §7). The token carries `sub` (user id) and `role` as claims — role checks
read the token directly and never hit the database (a real, measured latency optimization — see
`docs/architecture.md`). Only `GET /api/auth/me` performs a real database lookup, for the user's name/email.

**Demo accounts** (password for all: `Demo@1234`):

| Email | Role |
|---|---|
| admin@example.com | ADMIN |
| generator@example.com | WASTE_GENERATOR |
| facility@example.com | FACILITY_OPERATOR |

---

## 4. Pages & Features

| # | Page | Route | What it does |
|---|---|---|---|
| 1 | Login | `/login` | Email/password JWT login, demo accounts shown on-screen |
| 2 | Dashboard | `/dashboard` | 5 KPI cards + 5 charts, all live backend aggregations — never a hardcoded number |
| 3 | Network Map | `/map` | Leaflet + OpenStreetMap; generator/facility markers with real popups; filters (waste type, generator type, facility type, status); real optimized-route polylines |
| 4 | Waste Generators | `/waste` | Full CRUD via accessible modal form (Radix Dialog), role-gated actions, quick-link to Matching per record |
| 5 | Facilities | `/facilities` | Full CRUD, capacity/utilization progress bars, waste-type compatibility enforced in the form itself |
| 6 | AI Forecast | `/forecast` | XGBoost prediction, historical-vs-forecast chart, real confidence score, "how it works" explainer |
| 7 | Smart Matching | `/matching` | Transparent weighted scoring engine, real PostGIS distances, explainable reasons, deep-links onward to Routes |
| 8 | Routes | `/routes` | Real Google OR-Tools vehicle routing, capacity constraints, drop-and-report, route map + timeline, deep-links onward to Carbon |
| 9 | Carbon Impact | `/carbon` | 4-function calculation engine, route-specific mechanisms, transparent breakdown, 3 charts |

**Full integration (Phase 9):** Matching → Routes → Carbon are connected via deep-linking (a match's
facility carries into Route Optimization; a route stop's waste record + facility carries into Carbon
Impact and auto-calculates) — one traceable click-through, not three disconnected pages.

---

## 5. Database Schema

PostgreSQL + PostGIS. Every location is a `GEOGRAPHY(POINT, 4326)` column with a GIST spatial index
(auto-created by GeoAlchemy2). All 9 tables, verified against the live schema:

```
User (auth only — role determines UI/write access, not row ownership)

WasteGenerator ──< WasteRecord ──< Match >── Facility
      │                 │                        │
      │                 │                        ├──< Route ──< RouteStop >── WasteRecord
      │                 └──< CarbonRecord >──────┘
      │                        (facility_id added Phase 8 — see below)
      │
      └──< Forecast   (generator_id + waste_type; not tied to one WasteRecord)
```

| Table | Key columns |
|---|---|
| **users** | `id, name, email (unique), hashed_password, role, created_at, updated_at` |
| **waste_generators** | `id, name, generator_type, contact_name, phone, email, address, location (Geography POINT), created_at, updated_at` |
| **waste_records** | `id, generator_id → waste_generators, waste_type, quantity_tonnes, moisture_percent, available_from, available_until, status, created_at, updated_at` |
| **facilities** | `id, name, facility_type, capacity_tonnes, current_load_tonnes, accepted_waste_types (array), address, location (Geography POINT), status, created_at, updated_at` |
| **matches** | `id, waste_record_id → waste_records, facility_id → facilities, compatibility_score, distance_km, estimated_transport_cost, reasons (string array), status, created_at` |
| **routes** | `id, facility_id → facilities, vehicle_capacity_tonnes, total_distance_km, estimated_transport_cost, total_waste_tonnes, route_geometry (Geography LINESTRING), status, created_at` |
| **route_stops** | `id, route_id → routes, waste_record_id → waste_records, stop_order, quantity_tonnes` |
| **forecasts** | `id, generator_id → waste_generators, waste_type, forecast_date, predicted_quantity_tonnes, confidence, model_name, created_at` |
| **carbon_records** | `id, waste_record_id → waste_records, facility_id → facilities, waste_quantity_tonnes, conversion_type, conversion_output_tonnes, carbon_content_percent, estimated_sequestered_co2_tonnes, transport_emissions_tonnes, net_co2_impact_tonnes, methodology_note, created_at` |

**Enums:** `UserRole` (ADMIN/WASTE_GENERATOR/FACILITY_OPERATOR) · `GeneratorType` (FARM/FOOD_INDUSTRY/
MUNICIPALITY/INDUSTRIAL) · `WasteType` (RICE_STRAW/WHEAT_STRAW/COTTON_RESIDUE/SUGARCANE_RESIDUE/FOOD_WASTE/
ORGANIC_WASTE/ANIMAL_MANURE) · `WasteStatus` (AVAILABLE/PENDING/COLLECTED/PROCESSED) · `FacilityType`
(BIOCHAR/BIOGAS/BIOMASS_CONVERSION) · `FacilityStatus` (ACTIVE/INACTIVE/MAINTENANCE) · `MatchStatus`
(RECOMMENDED/ACCEPTED/REJECTED) · `RouteStatus` (PLANNED/IN_PROGRESS/COMPLETED)

`facility_id` on `carbon_records` was added during Phase 8, beyond the original column list — without it,
"Carbon impact by facility" (a required chart) couldn't be attributed to a specific facility, only a
facility *type*. Documented in `docs/carbon-methodology.md`.

---

## 6. Complete API Reference

All endpoints prefixed `/api`. Full interactive docs at `http://localhost:8000/docs` once the backend is
running.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Returns a JWT |
| GET | `/auth/me` | Current user's name/email/role (the one real DB-lookup auth call) |
| GET / POST | `/generators` | List / create waste generators |
| GET / PUT / DELETE | `/generators/{id}` | Read / update / delete one generator |
| GET / POST | `/waste` | List (joined with generator info) / create waste records |
| GET / PUT | `/waste/{id}` | Read / update one waste record |
| GET / POST | `/facilities` | List / create facilities |
| GET / PUT | `/facilities/{id}` | Read / update one facility |
| GET | `/dashboard/summary` | 5 KPI numbers, all live SQL aggregation |
| GET | `/dashboard/analytics` | Data for all 5 dashboard charts |
| POST | `/matching/recommend` | Transparent weighted facility recommendations for one waste record |
| GET | `/matching/{waste_id}` | Persisted match history for a waste record |
| POST | `/routes/optimize` | Real OR-Tools CVRP solve; persists the result |
| GET | `/routes` | All optimized routes |
| GET | `/routes/{id}` | One route in detail |
| POST | `/forecast` | XGBoost prediction for a generator/waste_type/month |
| GET | `/forecast/{generator_id}` | Forecast history for a generator |
| POST | `/carbon/calculate` | Runs the 4-function carbon pipeline for one waste_record + facility pair |
| GET | `/carbon` | All carbon records (drives the Carbon page's aggregate charts) |
| GET | `/carbon/{waste_id}` | Carbon calculation history for a waste record |

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript (strict mode) + Tailwind CSS + shadcn/ui + Recharts + Leaflet/react-leaflet |
| Backend | Python + FastAPI + Pydantic + SQLAlchemy + Alembic |
| Database | PostgreSQL + PostGIS (hosted on Neon) |
| ML | pandas, scikit-learn (Random Forest), XGBoost |
| Optimization | Google OR-Tools (constraint_solver / routing) |
| Auth | JWT (python-jose) + bcrypt password hashing + role-based access control |

---

## 8. Algorithms — one paragraph each

**Smart Matching** (`app/services/matching_service.py`): a transparent weighted score, never called AI.
`match_score = 40%·compatibility + 25%·distance + 20%·capacity + 15%·utilization`. Distance is a real
PostGIS `ST_Distance` geodesic query. Every score ships with a plain-English reasons list — nothing is a
black box. Weights live in `app/constants/matching_config.py`.

**Route Optimization** (`app/services/route_service.py`): a genuine single-vehicle Capacitated Vehicle
Routing Problem solved with Google OR-Tools, not a nearest-neighbor heuristic. The destination facility
doubles as the depot (documented simplification — no separate vehicle-yard entity exists). The full
pairwise distance matrix is computed in **one** PostGIS round trip via a `CROSS JOIN` over `unnest` arrays,
regardless of stop count. When total demand exceeds capacity, OR-Tools intelligently drops the
least-valuable stops (`AddDisjunction` with a steep penalty) and every drop is reported with a reason.

**AI Waste Forecast** (`ml/train.py`, `ml/predict.py`): Random Forest baseline → XGBoost final model,
trained on a 6-year synthetic-but-calibrated historical panel with a **time-based** train/test split
(2020–2024 train, 2025 test) — a random split would leak future values into lag features. Confidence is a
real signal derived from the Random Forest's per-tree prediction spread, not a fabricated number. Full
methodology in `docs/ml.md`.

**Carbon Impact** (`app/services/carbon_service.py`): four separate, named functions
(`calculate_conversion_output` → `calculate_sequestered_carbon` → `calculate_transport_emissions` →
`calculate_net_carbon_impact`), never one giant calculation. Biochar is modelled as literal sequestration
(IPCC AR6 retention fraction); biogas and biomass-conversion are modelled as *avoided* emissions — a
different mechanism, using a different factor, never conflated. Full methodology in
`docs/carbon-methodology.md`.

---

## 9. Real-World Data Grounding

Every number in the demo traces to either a real published source or a synthetic value calibrated against
one — see **`data/ml-data-research.md`** for the full research. Highlights:

- District-level crop production comes from real India government APY (Area/Production/Yield) statistics.
- Residue quantities use published Residue-to-Product Ratios (Hiloidhari et al. 2014; CSE reports).
- Every demo district is a real archetype: Anand/Mehsana (real dairy cooperative belts, Amul/Dudhsagar) →
  dairy manure → biogas; Kheda (real Charotar crop belt) → crop residue → biochar/biomass; Ahmedabad/
  Gandhinagar → real CPCB per-capita municipal waste rates.
- The biochar carbon-retention assumption is IPCC AR6 (2022).
- The 6-year ML training panel extends these same calibrated archetypes backward in time — clearly labelled
  "Demo / Synthetic Data" everywhere it's used.

---

## 10. Environment Variables

**`backend/.env`** (copy from `.env.example`):
`DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `MAPBOX_TOKEN` (optional),
`CORS_ORIGINS`, `ENVIRONMENT`

**`frontend/.env.local`** (copy from `.env.local.example`):
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN` (optional)

Nothing is hardcoded; see `README.md` for exact setup steps.

---

## 11. Development Phase Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation (repo, Next.js/Tailwind/shadcn, FastAPI/SQLAlchemy/Alembic, JWT auth) | ✅ Done |
| 2 | Core data (generators/waste/facilities CRUD + calibrated seed data) | ✅ Done |
| 3 | Dashboard (5 KPIs + 5 charts, live aggregation) | ✅ Done |
| 4 | GIS (interactive map, markers, filters) | ✅ Done |
| 5 | Smart Matching (transparent scoring, real PostGIS distance) | ✅ Done |
| 6 | Route Optimization (real OR-Tools CVRP) | ✅ Done |
| 7 | ML Forecasting (Random Forest → XGBoost, time-based split) | ✅ Done |
| 8 | Carbon Impact (4-function engine, per-route mechanisms) | ✅ Done |
| 9 | Full integration (Match → Route → Carbon connected via deep-linking, one traceable flow) | ✅ Done |
| 10 | Waste/Facilities CRUD screens (Radix Dialog forms, role-gated), 40-test suite | ✅ Done — deployment and a full a11y audit deliberately deferred |

## 12. Further Reading

- [`README.md`](README.md) — setup and run instructions
- [`docs/architecture.md`](docs/architecture.md) — system architecture, phase plan, technical decision log
- [`docs/ml.md`](docs/ml.md) — full ML methodology, results, known limitations
- [`docs/carbon-methodology.md`](docs/carbon-methodology.md) — full carbon calculation methodology
- [`data/ml-data-research.md`](data/ml-data-research.md) — every real-world data source and calibration used

---

*Generated with [Claude Code](https://claude.com/claude-code)*
