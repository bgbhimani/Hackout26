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
per-row ownership model). **The one exception is the match confirmation flow** (§4.3, §8): accepting or
rejecting a match, and building a route from it, requires the real `Facility.user_id` ownership link
described in §5 — the only row-level ownership check in the system, added specifically because "any
FACILITY_OPERATOR" isn't precise enough for "the operator who actually runs this facility."

| Role | Can read | Can write |
|---|---|---|
| **ADMIN** | Everything | Generators, waste records, facilities — and the only role that can **delete** a generator |
| **WASTE_GENERATOR** | Everything | Create/update generators and waste records |
| **FACILITY_OPERATOR** | Everything | Create/update facilities; accept/reject matches **for facilities they own**; plan routes |

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

### 4.1 Master list (all 9 pages)

| # | Page | Route | What it does |
|---|---|---|---|
| 1 | Login | `/login` | Email/password JWT login, demo accounts shown on-screen |
| 2 | Dashboard | `/dashboard` | 5 KPI cards + 5 charts, all live backend aggregations — never a hardcoded number |
| 3 | Network Map | `/map` | Leaflet + OpenStreetMap; generator/facility markers with real popups; filters (waste type, generator type, facility type, status); real optimized-route polylines |
| 4 | Waste Generators | `/waste` | Full CRUD via accessible modal form (Radix Dialog), role-gated actions, quick-link to Matching per record |
| 5 | Facilities | `/facilities` | Full CRUD, capacity/utilization progress bars, waste-type compatibility enforced in the form itself |
| 6 | AI Forecast | `/forecast` | XGBoost prediction, historical-vs-forecast chart, real confidence score, "how it works" explainer |
| 7 | Smart Matching | `/matching` | Transparent weighted scoring engine, real PostGIS distances, explainable reasons; every recommendation persists as a real, pending confirmation request |
| 7b | Pending Requests | `/matching/pending` | Facility-operator-only inbox: accept or reject each incoming match request — the real confirmation step (see below) |
| 8 | Routes | `/routes` | Real Google OR-Tools vehicle routing over **ACCEPTED** matches only, capacity constraints, drop-and-report, route map + timeline |
| 9 | Carbon Impact | `/carbon` | 4-function calculation engine, route-specific mechanisms, transparent breakdown, 3 charts |

**Full integration, with a real confirmation gate:** a Waste Generator's Smart Matching search persists a
`Match` row as `RECOMMENDED` for every candidate facility — nothing more happens until the **Facility
Operator who actually owns that facility** accepts or rejects it on `/matching/pending`. Accepting reserves
the waste (`WasteRecord.status → PENDING`) and auto-rejects every other still-`RECOMMENDED` match for that
same waste record, so it can't end up "accepted" at two facilities at once. Only then does that waste
record become selectable on `/routes` — `POST /api/routes/optimize` independently re-validates server-side
that every requested waste record has an `ACCEPTED` match for that exact facility, rejecting the request
with a 422 otherwise; a stop that's actually routed flips to `COLLECTED`, which is what makes the
Dashboard's "waste diverted" KPI (§4.3, Dashboard) report real, non-zero tonnage. This is the real
Match → Confirm → Route → Carbon chain, not a same-user click-through.

### 4.2 Features by role

Role determines *write* access to a feature, not visibility — every authenticated role can view every
page (see §3). The table below is the practical "what does each role actually **do**" breakdown.

| Feature | Waste Generator | Facility Operator | Administrator |
|---|---|---|---|
| Dashboard | View network KPIs | View network KPIs | Primary home page — full network oversight |
| Network Map | View generators/facilities/routes | View generators/facilities/routes | View + spot network-wide gaps |
| Waste Generators (`/waste`) | **Create/update** their own waste records | View only | Create/update **and delete** any generator |
| Facilities (`/facilities`) | View only | **Create/update** their own facility | Create/update any facility |
| AI Forecast (`/forecast`) | Run forecasts for their generators | View only | Run forecasts for any generator |
| Smart Matching (`/matching`) | **Initiate** — find a facility for a waste record | — | Initiate on behalf of any generator |
| Pending Requests (`/matching/pending`) | — | **Accept/reject** requests for the facility they own | — (facility-ownership gated, no admin bypass) |
| Route Optimization (`/routes`) | View only (their waste is a stop) | **Initiate** — plan pickup routes from **ACCEPTED** matches at their facility | Initiate for any facility |
| Carbon Impact (`/carbon`) | View impact of their diverted waste | **Initiate** the calculation for waste they processed | View/initiate across the network |
| Delete a generator | — | — | **Only role that can** |

Grouped by role, in the order each would naturally use them:

**Waste Generator** — `/waste` (log waste) → `/forecast` (plan ahead) → `/matching` (find a facility, which
sends a real pending request) → `/map` (see where they sit) → `/dashboard` (see network context).

**Facility Operator** — `/facilities` (manage capacity) → `/matching/pending` (accept or reject incoming
requests — the actual confirmation step) → `/routes` (plan efficient pickup from what they've accepted) →
`/carbon` (calculate impact of processed waste) → `/map` + `/dashboard` (context).

**Administrator** — `/dashboard` (daily network health check) → `/map` (spot gaps/imbalances) → all CRUD
pages as needed, plus the sole ability to delete a generator outright.

A full narrative walkthrough of each role's real-world problem and day-to-day journey — not just a feature
list — lives in [`FEATURES_AND_USERS.md`](FEATURES_AND_USERS.md).

### 4.3 Detailed feature summaries

**Dashboard** (`/dashboard`) — Five KPI cards (total waste available, tonnes diverted, active facilities,
active routes, estimated CO₂ impact) and five charts (waste availability over time, waste by type, waste
diverted over time, facility utilization, carbon impact over time), all served by two aggregation
endpoints (`/dashboard/summary`, `/dashboard/analytics`) that run real SQL `GROUP BY`/`SUM` queries against
live data — nothing here is a hardcoded demo number. This is the terminal view every other feature's data
eventually rolls up into.

**Network Map** (`/map`) — A Leaflet + OpenStreetMap view plotting every generator and facility from their
real `Geography(POINT)` coordinates, plus every optimized route's actual polyline (from `route_geometry`,
a `Geography(LINESTRING)`). Filterable by waste type, generator type, facility type, and status. It's a
read-only spatial lens onto the rest of the system — the one place gaps (an unmatched generator far from
any compatible facility) are visible at a glance instead of buried in table rows.

**Waste Generators** (`/waste`) — Full CRUD on waste records (type, quantity in tonnes, moisture %,
availability window) via an accessible Radix Dialog modal form, with role-gated create/edit and a
quick-link from each record straight into Smart Matching. This is the single entry point for all
real-world supply data — every downstream feature (Forecast, Matching, Routes, Carbon) ultimately traces
back to a row logged here.

**Facilities** (`/facilities`) — Full CRUD on facility records (type, rated capacity, current load,
accepted waste types), with a live capacity/utilization progress bar and waste-type compatibility
enforced directly in the form (a Biochar facility's form won't let you select animal manure as an accepted
type). Without an accurate accepted-type list and live capacity here, Matching would recommend facilities
that can't actually take the waste.

**AI Forecast** (`/forecast`) — Predicts next month's waste quantity for a chosen generator/waste-type
pair. Random Forest baseline, XGBoost as the final model, trained on a 6-year calibrated historical panel
with a genuine time-based train/test split (2020–2024 train, 2025 test — a random split would leak future
values into lag features). The confidence score is a real signal derived from the Random Forest's
per-tree prediction spread, not a fabricated percentage. Includes a historical-vs-forecast chart and a
plain-language "how it works" explainer so the number isn't presented as a black box.

**Smart Matching** (`/matching`) — For one waste record, ranks every waste-type-compatible facility with a
transparent weighted score: `40% compatibility + 25% distance + 20% capacity + 15% utilization`. Distance
is a real PostGIS `ST_Distance` geodesic query, not a straight-line approximation. Every candidate ships
with a plain-English reasons list (e.g. "18.3 km away · 62% spare capacity · accepts rice straw") —
deliberately never marketed as "AI" because nothing about it is opaque. Every recommendation is persisted
as a real `Match` row with `status=RECOMMENDED` — this is a genuine request sent to that facility, not just
a number shown on screen; the generator sees "Request sent — awaiting the facility operator" once it's
saved.

**Pending Requests** (`/matching/pending`) — The real confirmation step, and the only place a `Match` ever
changes status. A Facility Operator sees every `RECOMMENDED` match for a facility **they own**
(`Facility.user_id` — see §5) and can Accept or Reject. Accepting: (1) sets that match to `ACCEPTED`, (2)
auto-rejects every other still-`RECOMMENDED` match for the same waste record (a waste record can't be
accepted at two facilities at once), (3) moves the waste record to `PENDING` (reserved for pickup).
Rejecting leaves the waste record untouched (`AVAILABLE`) so it can still be matched elsewhere. Ownership
is enforced server-side (`app/services/matching_service.py::accept_match`/`reject_match`) — a facility
operator cannot accept a match for a facility they don't run; a non-owner gets a 404, not a 403, so the
match's existence isn't confirmed to them either.

**Route Optimization** (`/routes`) — Solves a genuine single-vehicle Capacitated Vehicle Routing Problem
with Google OR-Tools (`pywrapcp`) across the generators matched to one facility (the depot), not a
nearest-neighbor shortcut. Critically, it only accepts waste records with an **`ACCEPTED`** match for that
exact facility — `POST /api/routes/optimize` re-validates this server-side and returns a 422 naming any
waste record that hasn't actually been confirmed, so the UI's facility-scoped picker (backed by
`GET /api/matching/accepted`) can't be bypassed by calling the API directly. The full pairwise distance
matrix is computed in one PostGIS round trip via a `CROSS JOIN` over `unnest` arrays regardless of stop
count. When total demand exceeds vehicle capacity, OR-Tools deliberately drops the least-valuable stops
(`AddDisjunction` with a steep penalty) and reports every drop with a reason — never silently failing or
pretending the truck can carry more than it can. Every stop that's actually routed flips its waste record
to `COLLECTED`; a stop the optimizer dropped stays `PENDING` (still accepted, just not on this trip).

**Carbon Impact** (`/carbon`) — Runs a four-step, named-function calculation pipeline
(`calculate_conversion_output` → `calculate_sequestered_carbon` → `calculate_transport_emissions` →
`calculate_net_carbon_impact`) for a waste record + the facility that processed it. Biochar is modelled as
literal sequestration (IPCC AR6 carbon-retention fraction); biogas and biomass-conversion are modelled as
*avoided* emissions instead — a genuinely different physical mechanism, using a different factor, never
conflated with biochar's. Three charts (by waste type, by facility, over time) aggregate every calculated
record. This is the "MEASURE" step every other feature exists to feed.

---

## 5. Database Schema

PostgreSQL + PostGIS. Every location is a `GEOGRAPHY(POINT, 4326)` column with a GIST spatial index
(auto-created by GeoAlchemy2). All 9 tables, verified against the live schema:

```
User (auth only for most roles - but see Facility.user_id below)
  │
  └──< Facility   (user_id: the Facility Operator who owns/runs it - nullable, ON DELETE SET NULL)

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
| **facilities** | `id, name, facility_type, capacity_tonnes, current_load_tonnes, accepted_waste_types (array), address, location (Geography POINT), status, user_id → users (nullable), created_at, updated_at` |
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

`user_id` on `facilities` was added post-Phase-10, to build the real match accept/reject confirmation flow
(§4.3). Before this column existed, there was no way to determine which Facility Operator ran a given
facility at all — role checks alone (`require_role`) can't answer "does *this* user own *this* facility,"
only "is this user *a* facility operator." Nullable and `ON DELETE SET NULL` (not `CASCADE`): a facility
seeded by `scripts/seed_demo_data.py`, or created by an ADMIN on someone's behalf, legitimately has no
owner, and deleting a user account should orphan their facility, not delete it and every match/route/carbon
record built on it.

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
| POST | `/matching/recommend` | Transparent weighted facility recommendations for one waste record; persists each as a `RECOMMENDED` match |
| GET | `/matching/pending` | **FACILITY_OPERATOR only.** RECOMMENDED matches for facilities the caller owns — the accept/reject inbox |
| GET | `/matching/accepted?facility_id=` | **FACILITY_OPERATOR/ADMIN.** ACCEPTED-but-not-yet-routed matches for one facility — what Routes can build from |
| POST | `/matching/{match_id}/accept` | **FACILITY_OPERATOR only, ownership-checked.** Accepts a match; auto-rejects sibling matches for the same waste record; waste record → `PENDING` |
| POST | `/matching/{match_id}/reject` | **FACILITY_OPERATOR only, ownership-checked.** Rejects a match; waste record is left `AVAILABLE` |
| GET | `/matching/{waste_id}` | Persisted match history for a waste record |
| POST | `/routes/optimize` | **FACILITY_OPERATOR/ADMIN only.** Real OR-Tools CVRP solve over **ACCEPTED** matches for the given facility (422 otherwise); persists the result; routed stops' waste records → `COLLECTED` |
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
black box. Weights live in `app/constants/matching_config.py`. Every recommendation is persisted as a
`Match` row (`status=RECOMMENDED`) — `recommend_facilities()` doesn't just compute and return a number, it
creates a real, actionable request. `accept_match()`/`reject_match()` are the confirmation step: ownership
is checked against `Facility.user_id` (404, not 403, if the caller doesn't run that facility — its
existence isn't confirmed to them either), accepting auto-rejects every other still-`RECOMMENDED` sibling
match for the same waste record, and only an already-`RECOMMENDED` match is actionable (re-deciding an
`ACCEPTED`/`REJECTED` match is a 422, never a silent overwrite).

**Route Optimization** (`app/services/route_service.py`): a genuine single-vehicle Capacitated Vehicle
Routing Problem solved with Google OR-Tools, not a nearest-neighbor heuristic. The destination facility
doubles as the depot (documented simplification — no separate vehicle-yard entity exists). Before any
solving happens, every requested waste record must have an `ACCEPTED` match for that exact facility
(`Match.status == ACCEPTED`, checked against the DB, not trusted from the request) — otherwise a 422 names
exactly which ones aren't confirmed. The full pairwise distance matrix is computed in **one** PostGIS round
trip via a `CROSS JOIN` over `unnest` arrays, regardless of stop count. When total demand exceeds capacity,
OR-Tools intelligently drops the least-valuable stops (`AddDisjunction` with a steep penalty) and every drop
is reported with a reason. A stop that makes it into the solved route flips its waste record to
`COLLECTED`; a dropped stop stays `PENDING`.

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
| 11 | Real match confirmation flow: `facilities.user_id` ownership, accept/reject endpoints, `/matching/pending` inbox, route optimization gated to ACCEPTED matches, real WasteStatus transitions (`AVAILABLE→PENDING→COLLECTED`) | ✅ Done — see §4.3, §8; full DB-backed integration tests for accept/reject are a known coverage gap (this repo has no DB test fixture harness; only the pure decision logic is unit-tested) |

## 12. Further Reading

- [`FEATURES_AND_USERS.md`](FEATURES_AND_USERS.md) — every feature's real-world use case, how features connect to each other, and a full breakdown of what each user role does and why
- [`README.md`](README.md) — setup and run instructions
- [`docs/architecture.md`](docs/architecture.md) — system architecture, phase plan, technical decision log
- [`docs/ml.md`](docs/ml.md) — full ML methodology, results, known limitations
- [`docs/carbon-methodology.md`](docs/carbon-methodology.md) — full carbon calculation methodology
- [`data/ml-data-research.md`](data/ml-data-research.md) — every real-world data source and calibration used

---

*Generated with [Claude Code](https://claude.com/claude-code)*
