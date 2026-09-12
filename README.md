# Waste-to-Carbon Value Chain Tracker

**Team:** Gentalmen (4 members) · **Event:** HackOut'26, DAIICT
**Theme:** Circular Carbon Ecosystem
**Status:** Phase 1 (Foundation) and Phase 2 (Core Data) complete and verified against a live Neon Postgres+PostGIS database. See [docs/architecture.md](docs/architecture.md) for the full phase plan.

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
- [ ] Phases 6–10 — see [docs/architecture.md](docs/architecture.md)

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

---

*Generated with [Claude Code](https://claude.com/claude-code)*
