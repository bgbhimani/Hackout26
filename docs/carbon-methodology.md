# Carbon Impact Methodology

## The rule this entire engine follows

**Never `1 tonne waste = X tonnes CO₂` as a universal constant.** The factor used depends on the specific
conversion route (facility type) and, for the avoided-emissions routes, the specific waste type. Every
number is named, cited, and stored in `backend/app/constants/carbon_factors.py` — never a bare literal
inside a calculation function.

## Pipeline

Implemented as four separate, named functions in `backend/app/services/carbon_service.py` — not one giant
calculation:

```
waste_quantity_tonnes
      │
      ▼
calculate_conversion_output()        → conversion_output_tonnes
      │
      ▼
calculate_sequestered_carbon()       → estimated_sequestered_co2_tonnes, carbon_content_percent
      │
      ▼
calculate_transport_emissions()      → transport_emissions_tonnes
      │
      ▼
calculate_net_carbon_impact()        → net_co2_impact_tonnes
```

## Two fundamentally different mechanisms, by route

| Facility type | Mechanism | Formula |
|---|---|---|
| **BIOCHAR** | Literal carbon sequestration via pyrolysis | `quantity × 45% carbon content × 50% retention (IPCC AR6) × 44/12 (CO₂:C)` |
| **BIOGAS** | Avoided emissions (methane capture instead of open decomposition) | `quantity × avoided-emissions factor[waste_type]` |
| **BIOMASS_CONVERSION** | Avoided emissions (processed fuel instead of open burning/landfill) | `quantity × avoided-emissions factor[waste_type]` |

These are not the same calculation with different constants swapped in — biochar physically locks carbon
into a stable solid; the other two routes prevent emissions that would otherwise happen. Conflating them
would misrepresent the mechanism, so `carbon_content_percent` is explicitly labelled as "not used in this
route's calculation" in the methodology note whenever the avoided-emissions path is taken.

## Every cited constant

| Constant | Value(s) | Source |
|---|---|---|
| `CONVERSION_OUTPUT_FRACTION` | BIOCHAR 0.30, BIOGAS 0.90, BIOMASS_CONVERSION 0.85 | Typical pyrolysis/digestion/processing mass-balance approximations — see `data/ml-data-research.md` |
| `BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION` | 0.45 | Typical dry-biomass carbon content |
| `BIOCHAR_CARBON_RETENTION_FRACTION` | 0.50 | IPCC AR6 (2022) biochar guidance |
| `CO2_PER_C` | 44/12 | Molecular weight ratio — chemistry, not a citation |
| `AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK` | 0.25–0.45, by waste type | Approximate avoided-emissions estimate, explicitly coarser than an IPCC Tier 2 calculation |
| `TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM` | 0.0001 | DEFRA/DESNZ UK Government GHG Conversion Factors (standard proxy for diesel freight) |

## Real distance, not a flat assumption

Transport emissions use the actual PostGIS `ST_Distance` geodesic distance between the specific waste
generator and the specific facility for this calculation — the same real-distance mechanism used by the
matching engine (Phase 5) and route optimizer (Phase 6), not a flat per-shipment guess.

## What every `CarbonRecord` stores, and why

Every field name matches one step of the pipeline above, and `methodology_note` spells out in plain text
exactly which constants and which real distance were used for that specific record — so a judge (or an
auditor) can trace any number back to its source without reading the code.

`facility_id` was added to the schema during Phase 8 (not in the original spec'd column list) specifically
because "Carbon impact by facility" — a required chart — cannot be attributed to a *specific* facility from
`conversion_type` alone (several facilities can share a type, e.g. two different BIOCHAR plants).

## Labelling rules, enforced in the UI

- Every headline number is labelled **"Estimated CO₂ impact"** or **"Estimated carbon benefit"** — never a
  bare number implying certainty.
- Never: "verified carbon credit", "certified offset", "guaranteed sequestration", or automatic credit
  issuance language anywhere in the product.
- Proper Unicode throughout displayed text: **CO₂**, **CO₂e** — never plain "CO2" in anything the user reads
  (API/DB field names use `co2` in snake_case, which is a separate, internal concern).

## Known limitations (disclosed, not hidden)

- Avoided-emissions factors are approximate, not an IPCC Tier 2 calculation with region-specific
  emission factors.
- BIOMASS_CONVERSION's fossil-fuel-displacement benefit (processed biomass fuel replacing coal/diesel) is
  not separately quantified in this MVP — only the avoided-decomposition/burning emissions are counted.
- Transport emissions use a single generic diesel-truck freight factor (DEFRA/DESNZ), not an India-specific
  or vehicle-specific factor.
