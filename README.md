# Waste-to-Carbon Value Chain Tracker

**Team:** Gentalmen (4 members) · **Event:** HackOut'26, DAIICT
**Theme:** Circular Carbon Ecosystem
**Status:** Phases 1–8 of 10 complete and verified against a live Neon Postgres+PostGIS database.
**For the complete reference (roles, features, full database schema, full API list, algorithms, data
grounding) see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md).** See [docs/architecture.md](docs/architecture.md) for the full phase plan.

## Problem Statement

> Organic and industrial waste that could be converted into biochar, biogas, or carbon-negative materials
> frequently ends up in landfills instead. This problem involves building a platform that connects waste
> generators (farms, food industries, municipalities) with carbon-conversion facilities, optimizes collection
> logistics, and calculates the CO₂ sequestered per ton of waste diverted from landfill.

**Target users:** Municipalities, farms, food/industrial waste generators, biochar/biogas facility operators.

## The workflow this platform demonstrates

```
Waste Generator → Waste Data → AI Waste Forecasting → Smart Facility Matching
                                                              ↓
                              Impact Dashboard ← Carbon Impact ← Route Optimization
```

**PREDICT → MATCH → ROUTE → MEASURE**

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript (strict) + Tailwind CSS + shadcn/ui + Recharts + Leaflet/Mapbox |
| Backend | Python + FastAPI + Pydantic + SQLAlchemy + Alembic |
| Database | PostgreSQL + PostGIS |
| ML | pandas, scikit-learn, XGBoost |
| Optimization | Google OR-Tools |
| Auth | JWT + bcrypt password hashing + role-based access control |

## Real-world grounding

Every number the demo uses is either a real published statistic or a synthetic value calibrated against
one. See **[data/ml-data-research.md](data/ml-data-research.md)** for the full research: the real
district-wise crop production dataset used as the ML backbone, published residue-to-product ratio
conversion factors, the real Gujarat dairy/crop context behind every demo district, and the cited IPCC
biochar carbon-retention assumption behind the carbon calculation engine.

## Project structure

```
project-root/
├── backend/     FastAPI application (see backend/app/)
├── frontend/    Next.js application (see frontend/app/)
├── ml/          Training pipeline (Phase 7)
├── data/        Dataset research + seed data (Phase 2)
├── docs/        Architecture, ML methodology, carbon methodology, API docs
└── README.md
```

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # then fill in DATABASE_URL and JWT_SECRET
alembic upgrade head             # applies migrations (requires a real DATABASE_URL)
python -m scripts.seed_users     # creates the three demo accounts
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/health` (works even without a database) and `http://localhost:8000/docs`
for interactive API documentation.

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/login`. Demo accounts and the shared demo password
are shown on the login page itself.

## Running Tests

```bash
# Backend unit tests (pure calculation logic - matching scores, carbon math,
# auth/JWT - none of these touch the shared live database)
cd backend && .venv\Scripts\activate && python -m pytest tests/ -v

# ML pipeline tests (feature engineering correctness, including a regression
# guard for the exact grouped-rolling-average leakage bug found during
# development - see docs/ml.md)
cd ml && python -m pytest tests/ -v
```

40 tests, all passing: 30 backend (security/JWT, matching engine scoring math, carbon calculation math)
+ 10 ML (season derivation, prediction output format, training data integrity, the leakage-bug regression
guard). API-level integration tests against a live database are intentionally out of scope for this MVP —
documented as a known limitation rather than silently skipped.

## Current status (Phase 1 of 10)

- [x] Monorepo structure
- [x] Next.js + React + TypeScript (strict) + Tailwind CSS + shadcn/ui, light theme
- [x] FastAPI + Pydantic + SQLAlchemy + Alembic, boots without a database (`/health`)
- [x] All 9 database models defined (users, waste_generators, waste_records, facilities, matches, routes,
      route_stops, forecasts, carbon_records) with PostGIS geography columns
- [x] JWT authentication (login, `/api/auth/me`, role-based dependency helpers)
- [x] Application shell: responsive sidebar + topbar, all 8 pages routable
- [x] Environment configuration (`.env.example` for both apps, nothing hardcoded)
- [x] Postgres+PostGIS database connected (Neon), migrated, demo users seeded, login verified end-to-end
- [x] Generators/Waste/Facilities CRUD APIs, role-based write access, PostGIS lat/lng round-trip
- [x] 16 waste generators + 7 facilities + 154 waste records seeded, every quantity calibrated against
      a cited real figure (see `data/ml-data-research.md` and `backend/scripts/seed_demo_data.py`)
- [x] Dashboard: 5 KPI cards + 5 charts, all real backend aggregation, honest zero/empty states for
      not-yet-built Routes/Carbon phases
- [x] Network Map: Leaflet + OpenStreetMap, generator/facility markers with real popups, filters
      (waste type / generator type / facility type / status), legend, summary cards
- [x] Smart Matching: transparent weighted scoring (compatibility/distance/capacity/utilization),
      real PostGIS `ST_Distance` geodesic distances, persisted + re-runnable recommendations
- [x] Route Optimization: real Google OR-Tools CVRP, single-vehicle, capacity constraints, drop-and-report
      when stops don't fit, route polylines drawn on both the Routes page and the main Network Map
- [x] AI Waste Forecast: Random Forest baseline + XGBoost final model, time-based train/test split (not
      random), real confidence score from ensemble prediction spread — see [docs/ml.md](docs/ml.md)
- [x] Carbon Impact: modular 4-function calculation engine, real PostGIS distance for transport emissions,
      route-specific mechanisms (biochar sequestration vs. biogas/biomass avoided-emissions) — see
      [docs/carbon-methodology.md](docs/carbon-methodology.md)
- [x] Full Integration: Match → Route → Carbon connected via deep-linking, so a recommendation carries
      its facility forward into Route Optimization, and a route stop carries its waste record + facility
      forward into an auto-calculated Carbon Impact - no re-selecting the same thing three times
- [x] Waste Generators and Facilities management screens: full CRUD via accessible modal forms
      (Radix Dialog - focus trap, ESC to close, proper ARIA), role-gated actions (only permitted roles see
      Add/Edit/Delete), client-side + server-side validation
- [x] Test suite: 40 tests (30 backend unit tests + 10 ML pipeline tests), all passing
- [ ] Deferred, disclosed rather than silently skipped: a full accessibility audit, a deployed public URL,
      and API-level integration tests against a live database — see "Known, deliberate limitations" below

### Run it yourself right now

```bash
cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
# in another terminal
cd frontend && npm run dev
```

Open `http://localhost:8000/docs` for interactive API docs (try `/api/generators`, `/api/facilities`,
`/api/waste` after logging in), or `http://localhost:3000/login` for the app shell.

## Known, deliberate limitations (disclosed, not hidden)

- Demo/seed data (built in Phase 2) is synthetic, calibrated against real government statistics and
  published literature — see `data/ml-data-research.md` for exactly which numbers are real vs. derived.
- Carbon impact figures are always labelled "Estimated CO₂ impact", never a certified or verified offset.
- `npm audit` reports 4 dev-dependency advisories (ESLint config parsing, PostCSS source-map handling)
  that require a Next.js 16 major-version upgrade to fully clear; none are exploitable in this app's own
  build (no untrusted CSS/source-map input), so we're deferring that upgrade rather than risking breakage
  mid-hackathon.
- No API-level integration tests against a live database — the 40-test suite covers pure calculation
  logic (matching scores, carbon math, JWT/auth, ML feature engineering) which is fast, safe, and never
  touches the shared Neon database; endpoint-level tests would need a dedicated test database this
  hackathon's timeline didn't allocate for.
- No full accessibility audit (screen-reader pass, WCAG contrast check) — semantic HTML, labelled form
  fields, and Radix's built-in focus-trap/ARIA (Dialog) are in place, but not independently audited.
- Not deployed to a public URL — runs locally against the live Neon database; Vercel/Render deployment
  steps are documented but not executed for this submission.

---

*Generated with [Claude Code](https://claude.com/claude-code)*
