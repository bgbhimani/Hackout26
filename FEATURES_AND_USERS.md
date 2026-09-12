# Features, Use Cases & User Roles — Waste-to-Carbon Value Chain Tracker

This document answers three questions the technical reference (`PROJECT_OVERVIEW.md`) doesn't focus on:
**who uses this platform, what each feature is *for*, and how the features connect into one working
value chain** rather than sitting as nine disconnected pages. Read this before a demo or pitch; read
`PROJECT_OVERVIEW.md` for schema/API/algorithm detail.

---

## 1. The core idea in one sentence

Waste that currently goes to a landfill (crop residue, dairy manure, food/municipal waste) has a
carbon-negative home (biochar, biogas, biomass-conversion facilities) — this platform closes that loop by
**predicting** how much waste is coming, **matching** it to the right facility, having the facility
**confirm** it will actually take that waste, **routing** its collection efficiently, and **measuring** the
CO₂ impact of every tonne diverted. Every feature on every page exists to serve one of those five verbs.

```
   PREDICT              MATCH               CONFIRM                ROUTE                MEASURE
  (Forecast)          (Matching)         (Pending Requests)       (Routes)             (Carbon)
      │                    │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼                    ▼
"How much waste     "Which facility     "Does the facility    "In what order should   "How much CO₂e did
will Generator X    should take this    operator accept       one truck visit these   this tonne of waste
produce next        waste, and why?"    this specific         generators, given        actually save?"
month?"                                 request?"             capacity limits?"
```

The CONFIRM step is the real handshake between two independent parties (a Waste Generator's request,
checked and accepted or rejected by the specific Facility Operator who owns that facility) — everything
before it is a computed suggestion; everything after it only happens because a human on the other side
actually said yes.

---

## 2. The three user roles

Roles are deliberately simple: **role determines what a user can create/edit, not what they can see.**
Everyone signed in can view the whole network — this mirrors how a real regional waste-coordination body
would work, where transparency across the chain is the point.

### 2.1 Waste Generator — *"I have waste. Where should it go, and when will someone collect it?"*

**Who this is in real life:** a farm or agricultural cooperative (crop residue — rice/wheat straw, cotton
residue, sugarcane bagasse), a food or dairy processing unit (organic byproduct, spent grain, dairy
manure), or a municipal body / APMC (segregated wet waste, market organic waste).

**Their problem before this platform:** they burn or dump residue because they have no visibility into
which conversion facility wants it, how far away it is, or when a truck is coming.

**What they do on the platform:**

| Feature | Why they use it |
|---|---|
| **Sign up** (`/signup`, Waste Generator track) | Registers their farm/plant with a name, type, address, and GPS coordinates — the coordinates are what make every downstream distance calculation real, not guessed. |
| **Waste Generators / My Waste** (`/waste`) | Logs a waste record: type, quantity (tonnes), moisture %, and the date range it's available for pickup. This is the raw input the entire value chain runs on. |
| **AI Forecast** (`/forecast`) | Instead of guessing, sees a model-predicted quantity for next month per waste type, with a real confidence score — useful for planning ahead of harvest season rather than reacting after the fact. |
| **Smart Matching** (`/matching`) | For a specific waste record, sees a ranked list of facilities that *actually* accept that waste type, with distance, spare capacity, and a plain-English reason for each score — not a black box. |
| **Network Map** (`/map`) | Visualizes where they sit relative to every facility and every planned route, so a recommendation from Matching isn't just a number — it's a place on a map. |
| **Dashboard** (`/dashboard`) | Sees network-wide KPIs (total waste available, tonnes diverted, active routes, CO₂ impact) for context, even though their own record is one row among many. |

**Typical journey:** log a waste record → check the AI forecast to see if this is a one-off or a recurring
monthly pattern → run Matching to find the best facility → (a facility operator or admin then builds a
Route that includes this generator as a stop) → once collected, a Carbon record is generated automatically
and the generator can see their contribution reflected in the network dashboard.

### 2.2 Facility Operator — *"How much can I take in, and how do I plan efficient pickups?"*

**Who this is in real life:** a biochar pyrolysis unit, a biogas/CBG anaerobic digestion plant, or a
biomass gasification & power facility.

**Their problem before this platform:** they have a fixed processing capacity and specific feedstock
requirements, but no systematic way to see which nearby generators have compatible waste, or how to plan
one truck's route instead of many uncoordinated pickups.

**What they do on the platform:**

| Feature | Why they use it |
|---|---|
| **Sign up** (`/signup`, Facility Operator track) | Registers the plant's type, rated capacity, current load, accepted feedstock types, and GPS location — accepted-feedstock compatibility is enforced right in the form so a Biochar plant can't accidentally claim it takes animal manure. |
| **Facilities** (`/facilities`) | Full CRUD on their facility record, with a live capacity/utilization progress bar so they can see at a glance how much headroom they have. |
| **Pending Requests** (`/matching/pending`) | Their real inbox — every match a generator's Smart Matching search sent to a facility **they own**, with Accept/Reject buttons. This is the actual confirmation step: nothing becomes a route until they act here. |
| **Route Optimization** (`/routes`) | The facility is always the depot in the routing problem, and the picker only offers waste they've **already accepted** on Pending Requests — the operator triggers a real Google OR-Tools solve that decides the optimal stop order for one vehicle across several matched generators, honestly reporting any stop that had to be dropped due to capacity. |
| **Carbon Impact** (`/carbon`) | For every waste record their facility processes, sees the calculated sequestered/avoided CO₂e, broken into transparent steps (never one opaque number) — this is what they'd report to a carbon-credit or ESG program. |
| **Network Map** (`/map`) | Sees their facility's position, its accepted waste types, and the live route polyline once a route is planned. |
| **Dashboard** (`/dashboard`) | Sees facility-utilization and carbon-impact-by-facility charts to understand their own plant's role in the wider network. |

**Typical journey:** update their facility's current load → get discovered by generators' Matching
searches → open **Pending Requests** and accept (or reject) each incoming match — this is a real decision
with real consequences, not a formality: accepting reserves that waste and auto-rejects any competing offer
for the same waste record → trigger Route Optimization to plan an efficient single-vehicle pickup across
everything they've accepted → once the route runs, run Carbon Impact calculation for each waste record
processed → track their plant's cumulative CO₂e contribution on the Dashboard.

### 2.3 Administrator — *"Is the whole network working the way it should?"*

**Who this is in real life:** a regional coordinator, NGO, or government body overseeing the whole
generator/facility ecosystem — not tied to one farm or one plant.

**Their problem before this platform:** no single view across every generator, every facility, every
planned route, and the aggregate carbon impact — everything lives in separate spreadsheets or, more
often, doesn't exist as data at all.

**What they do on the platform:** everything the other two roles can do, **plus**:

| Feature | Why they use it |
|---|---|
| **Delete a generator** | The only role that can remove a generator record outright (e.g., a duplicate registration or a generator that's shut down) — a deliberately narrow extra permission, not a general "admin does everything differently" model. |
| **Dashboard** (`/dashboard`) | Their primary home page — 5 KPI cards and 5 charts are aggregated across the *entire* network, not filtered to one generator or facility, giving the bird's-eye view their role is for. |
| **Network Map** (`/map`) | Full filterable view of every generator, every facility, and every optimized route at once — the tool for spotting, say, a cluster of unmatched generators far from any compatible facility. |

**Typical journey:** open the Dashboard each morning to check network-wide diversion and CO₂ totals → use
the Map to spot gaps (generators with no nearby compatible facility, or facilities running near-empty) →
intervene by correcting bad data (e.g., a duplicate generator) rather than by doing the generators' or
operators' day-to-day data entry for them.

### 2.4 Role → feature access matrix

| Feature / Page | Waste Generator | Facility Operator | Administrator |
|---|:---:|:---:|:---:|
| Dashboard | ✅ view | ✅ view | ✅ view |
| Network Map | ✅ view | ✅ view | ✅ view |
| Waste Generators (create/edit) | ✅ | — (view only) | ✅ |
| Facilities (create/edit) | — (view only) | ✅ | ✅ |
| AI Forecast | ✅ (own generators) | — (view only) | ✅ |
| Smart Matching | ✅ (initiate) | — | ✅ |
| Pending Requests (accept/reject) | — | ✅ **only for facilities they own** | — |
| Route Optimization | — (view only) | ✅ (initiate, ACCEPTED matches only) | ✅ |
| Carbon Impact | ✅ view | ✅ (initiate calc) | ✅ |
| Delete a generator | — | — | ✅ **only** |

*(Everyone authenticated can read every table — see §3 of `PROJECT_OVERVIEW.md` for exactly why that
data-visibility choice was made for an MVP of this scale. The one exception is Pending Requests: accepting
or rejecting a match is checked against the real `Facility.user_id` ownership link, not just role — a
Facility Operator can only act on matches for a facility they actually registered.)*

---

## 3. Every feature, its use case, and what it connects to

For each feature: **what it is → the real-world use case → what feeds it (upstream) → what it feeds
(downstream)**. This is the "how they're connected" answer in table form; §4 walks through one concrete
example end-to-end.

### 3.1 Waste record logging (`/waste`)
- **What:** CRUD for a generator's available waste — type, quantity, moisture %, availability window.
- **Use case:** the single entry point for all real-world supply data; without this, nothing downstream
  has anything to predict, match, route, or measure.
- **Upstream:** a registered Waste Generator (from signup).
- **Downstream:** feeds AI Forecast (as historical training signal for that generator/waste-type pair),
  Smart Matching (the specific record being matched), Route Optimization (as a stop's demand quantity),
  and Carbon Impact (the quantity the whole calculation is based on).

### 3.2 Facility management (`/facilities`)
- **What:** CRUD for a facility's type, capacity, current load, and accepted waste types.
- **Use case:** without a facility's accepted-waste-type list and live capacity, Matching would recommend
  facilities that physically can't take the waste, or are already full.
- **Upstream:** a registered Facility Operator (from signup).
- **Downstream:** feeds Smart Matching (candidate facility pool), Route Optimization (the depot + capacity
  constraint), Carbon Impact (which conversion mechanism — biochar/biogas/biomass — applies).

### 3.3 AI Waste Forecast (`/forecast`)
- **What:** an XGBoost model (Random Forest baseline) predicts next month's waste quantity for a
  generator/waste-type pair, trained on a 6-year calibrated historical panel with a real confidence score.
- **Use case:** turns waste generation from reactive ("I happen to have waste today") into plannable
  ("I'll have ~40 tonnes of rice straw next month") — useful for a facility operator deciding whether it's
  worth scheduling a route to a given area.
- **Upstream:** historical `WasteRecord` rows for that generator/waste-type.
- **Downstream:** informs (but does not automatically trigger) Smart Matching and Route Optimization
  decisions — a human still decides what to act on, the forecast just removes the guesswork.

### 3.4 Smart Matching (`/matching`)
- **What:** a transparent weighted score — `40% compatibility + 25% distance + 20% capacity + 15%
  utilization` — ranks every compatible facility for one waste record, with a real PostGIS geodesic
  distance and a plain-English reasons list per candidate. Every candidate is persisted as a real `Match`
  row (`status=RECOMMENDED`) — a genuine request sent to that facility, not just a number on screen.
- **Use case:** answers "which facility should take this waste, and why should I trust that answer?" —
  explicitly never called "AI" because it isn't a black box; every score is auditable.
- **Upstream:** one `WasteRecord` + the pool of `Facility` rows (filtered by accepted waste type).
- **Downstream:** every recommendation becomes a pending request the target facility's operator sees on
  Pending Requests (§3.4b) — nothing reaches Route Optimization until they act on it.

### 3.4b Pending Requests (`/matching/pending`)
- **What:** a Facility Operator's inbox of every `RECOMMENDED` match for a facility **they own**
  (`Facility.user_id`), with real Accept/Reject actions.
- **Use case:** this is the actual confirmation step between a generator and a facility — the answer to
  "how does the order get confirmed?" Accepting reserves the waste (`WasteRecord.status → PENDING`) and
  auto-rejects any other still-pending offer for the same waste record, so it can't be double-booked to two
  facilities; rejecting leaves the waste `AVAILABLE` for someone else to match. Ownership is enforced
  server-side, not just hidden in the UI — a non-owner gets a 404, not a 403.
- **Upstream:** Smart Matching's persisted `RECOMMENDED` matches.
- **Downstream:** only an `ACCEPTED` match here makes its waste record selectable on Route Optimization —
  this is the real second deep-link in the Match → Confirm → Route → Carbon chain (§4).

### 3.5 Route Optimization (`/routes`)
- **What:** a genuine single-vehicle Capacitated Vehicle Routing Problem (CVRP), solved with Google
  OR-Tools — not a nearest-neighbor shortcut — across the generators whose matches to one facility (the
  depot) have been **accepted**. The server independently re-checks this (422 if any requested waste record
  lacks an ACCEPTED match for that facility) — the UI's picker is a convenience, not the enforcement point.
  Honestly reports any stop dropped because total demand exceeded vehicle capacity.
- **Use case:** turns a list of *confirmed* pickups into one efficient truck route instead of separate,
  uncoordinated trips — the actual logistics cost driver in a real deployment.
- **Upstream:** a facility (depot) + its accepted matches (§3.4b).
- **Downstream:** a completed route's stops flip their waste record to `COLLECTED` (this is what makes the
  Dashboard's "waste diverted" KPI report real numbers) and feed Carbon Impact's transport-emissions
  calculation (distance actually driven) and the Network Map (the route polyline drawn live).

### 3.6 Carbon Impact (`/carbon`)
- **What:** four separate, named calculation steps — conversion output → sequestered carbon → transport
  emissions → net CO₂e impact — never one opaque formula. Biochar is modelled as literal sequestration
  (IPCC AR6 retention fraction); biogas/biomass-conversion are modelled as *avoided* emissions — a
  different physical mechanism, deliberately not conflated with biochar's.
- **Use case:** the actual point of the whole platform — converts a diverted tonne of waste into a
  defensible, methodology-cited CO₂e number, the kind of figure that could feed a carbon-credit
  application or an ESG report.
- **Upstream:** a waste record + the facility that processed it + (if applicable) the route that
  transported it (for the transport-emissions deduction).
- **Downstream:** aggregates into the Dashboard's network-wide CO₂ KPI and the carbon-impact-by-facility
  and carbon-impact-over-time charts — the final "MEASURE" step every other feature was built to support.

### 3.7 Network Map (`/map`)
- **What:** a live, filterable Leaflet map — every generator, every facility, and every optimized route's
  real polyline, plotted from actual GPS coordinates and PostGIS geometry.
- **Use case:** the one place the whole network is visible *spatially* rather than as table rows — makes
  gaps (an unmatched generator far from any facility) and route logic (why this stop order, not another)
  visually obvious in a way numbers alone aren't.
- **Upstream:** every other feature's data (generators, facilities, routes) — it's a read-only lens onto
  the rest of the system, not an independent data source.
- **Downstream:** none directly — it's the visualization endpoint, not an input to anything else.

### 3.8 Dashboard (`/dashboard`)
- **What:** 5 KPI cards + 5 charts, every one a live backend SQL aggregation — never a hardcoded number.
- **Use case:** the network's health at a glance — total waste available, tonnes diverted, active
  facilities, active routes, and estimated CO₂ impact — the first thing an Administrator checks, and
  useful context for generators/operators to see their own activity against the whole network.
- **Upstream:** aggregates across every other feature's data.
- **Downstream:** none — the terminal view of the whole chain.

---

## 4. One concrete example, start to finish

To make "how they're connected" concrete rather than abstract, here's a single tonne of waste's actual
path through every feature:

1. **A farm cooperative in Kheda** (Waste Generator role) logs a waste record: 40 tonnes of rice straw,
   available next week. *(§3.1)*
2. Because this generator has five years of prior records, the **AI Forecast** page shows this is
   consistent with their usual post-harvest pattern — confidence 82%. *(§3.3)*
3. The generator runs **Smart Matching** on that record: a Biochar facility 32 km away scores highest
   (compatible waste type, real PostGIS distance, plenty of spare capacity) — reasons listed in plain
   English, not just a number. This persists as a real `Match` row, `status=RECOMMENDED` — a request, not
   just a suggestion. *(§3.4)*
4. The **Facility Operator** who actually owns that Biochar plant opens **Pending Requests**, sees this
   request alongside its reasons, and clicks Accept. That single action reserves the waste
   (`WasteRecord.status → PENDING`) and auto-rejects any other facility's still-pending offer for the same
   40 tonnes — this is the real "how is the order confirmed" answer, not a formality. *(§3.4b)*
5. Only now can the operator trigger **Route Optimization** — the picker only offers waste that's actually
   been accepted for this facility, and the server independently re-checks that before solving anything.
   It bundles this generator with four other accepted generators into one OR-Tools-solved route — the
   facility is the depot, and the solver reports the optimal stop order. Every stop that makes it into the
   route flips its waste record to `COLLECTED`. *(§3.5)*
6. Once the route completes, **Carbon Impact** runs its four-step calculation for this waste record:
   conversion output → sequestered carbon (IPCC AR6 biochar retention fraction) → transport emissions (the
   actual route distance) → net CO₂e impact. *(§3.6)*
7. That net CO₂e number, along with this route's polyline, this facility's updated utilization, and the
   now-real "waste diverted" tonnage (nothing hit `COLLECTED` before step 5 existed), shows up on the
   **Network Map** and rolls into the **Dashboard**'s network-wide totals — visible to every role, not just
   the two who did the work. *(§3.7, §3.8)*

That's the full PREDICT → MATCH → **CONFIRM** → ROUTE → MEASURE chain. The confirm step is what makes this
a real handshake between two independent parties — a Facility Operator, checked against their own
`Facility.user_id`, actually deciding — rather than one user clicking through every page themselves.

---

## 5. Further reading

- [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) — database schema, full API reference, algorithm internals, tech stack
- [`docs/architecture.md`](docs/architecture.md) — system architecture and technical decision log
- [`docs/ml.md`](docs/ml.md) — full ML methodology
- [`docs/carbon-methodology.md`](docs/carbon-methodology.md) — full carbon calculation methodology
- [`data/ml-data-research.md`](data/ml-data-research.md) — every real-world data source and calibration used

---

*Generated with [Claude Code](https://claude.com/claude-code)*
