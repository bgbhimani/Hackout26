# ML Data Strategy — Real Datasets + Cited Conversion Factors

This document is the single source of truth for every number the synthetic data generator and the
forecasting model use. Every quantity in the demo must be traceable to one of the sources below.
**Answer to "did you fake this data?": our per-district, per-crop, per-year totals are calibrated
against real Government of India statistics and published scientific conversion factors. Only the
disaggregation into individual generator/month records is synthetic, because no public dataset exists
at that granularity — and the UI labels it "Demo / Synthetic Data" everywhere it appears.**

---

## 1. Real backbone dataset: District-wise Crop Area/Production/Yield (APY)

**Source:** Ministry of Agriculture & Farmers Welfare, Crop Statistics Information System, published on
the Open Government Data (OGD) Platform India.
- Catalog page: https://www.data.gov.in/catalog/district-wise-season-wise-crop-production-statistics-0
- Machine-readable mirror (India Data Portal / CKAN): direct CSV at
  `https://ckandev.indiadataportal.com/dataset/80789131-1b7d-4809-a03e-7ce88cee2917/resource/ead44f5f-6471-48ec-a488-4b5894302aaa/download/crop-wise-area-production-yield.csv`
- Kaggle mirrors of the same government source (useful if the portal is slow/down during the hackathon):
  `kaggle.com/datasets/pyatakov/india-agriculture-crop-production` (1997-2021, district-wise)

**What it contains:** state, district, crop year, season (Kharif/Rabi/Whole Year), crop name,
area (hectares), production (tonnes) — for every district in India, multi-year.

**What we use it for:** filter to our five demo districts (Gandhinagar, Ahmedabad, Mehsana, Kheda,
Anand) and our five crop types (Rice, Wheat, Cotton, Bajra, Groundnut) → gives us **real annual
production tonnage per district per crop**, which is the base quantity the residue-generation numbers
are calculated from. This is the one piece of the pipeline that is not invented.

---

## 2. Real conversion factor: Residue-to-Product Ratio (RPR)

Crop production data gives grain/lint tonnage, not residue tonnage. RPR converts one to the other and
is a standard, published figure in Indian agricultural-residue literature (Hiloidhari et al. 2014;
CSE "Agro-Residue for Power" report; ICAR residue management reviews).

| Crop | Residue | RPR (residue : product) | Cited range |
|---|---|---|---|
| Rice (paddy) | Rice straw | **1.5** | 1.5–1.73 (cereal crops) |
| Wheat | Wheat straw | **1.5** | 1.5–1.65 (cereal crops) |
| Cotton | Cotton stalk | **2.75** | 2.15–3.0 (fibre crops) |
| Bajra (pearl millet) | Bajra stover | **1.65** | 1.5–1.75 (cereal crops) |
| Groundnut | Groundnut shell/haulm | **2.3** | 2.0–3.0 (oilseed crops) |

`residue_tonnes = production_tonnes × RPR`. We use the midpoint of the cited literature range for each
crop family and store it in `backend/app/constants/carbon_factors.py` with the citation attached —
never a bare magic number.

---

## 3. Real regional grounding: why these five districts, these waste types

We are not inventing a generic "farms + factories" scenario. Each demo district is chosen because it is
a **real, documented waste-generator archetype** in Gujarat:

| District | Real basis | Generator type it justifies |
|---|---|---|
| **Anand** | Headquarters of Amul (Gujarat Cooperative Milk Marketing Federation); NDDB-backed manure-to-biogas pilots exist here today, e.g. the Zakariyapura village cooperative model | `ANIMAL_MANURE` generators feeding `BIOGAS` facilities |
| **Mehsana** | Home of Dudhsagar Dairy, one of India's largest dairy cooperatives; a documented real case: a 500 m³ biogas plant on a 200-buffalo farm generates ~500 kWh/day and saves ~₹1.2 lakh/month, 3.2-year payback | `ANIMAL_MANURE` generators feeding `BIOGAS` facilities |
| **Kheda** | The "Charotar" belt — paddy, tobacco and cotton growing region of central Gujarat | `RICE_STRAW`, `COTTON_RESIDUE` generators |
| **Ahmedabad** | Major urban + food-processing/textile industrial hub | `FOOD_WASTE`, `ORGANIC_WASTE` municipal/industrial generators |
| **Gandhinagar** | State capital, administrative + urban municipal waste | `ORGANIC_WASTE` municipal generators |

State-wide dairy figure used to calibrate manure generator quantities: Gujarat has an estimated
**~25 lakh (2.5 million) animals** in dairy farms and gaushalas, generating **~35,000 tonnes/day** of
dung, with an estimated **1.4 million m³/day** biogas potential (NDDB / dairy-cooperative studies,
2021-22). That implies **~14 kg/animal/day**, consistent with standard Indian cattle-dung-yield
literature (10–15 kg/animal/day) — this is the number a synthetic Anand/Mehsana dairy-cooperative
generator's daily manure output is scaled from.

Municipal waste generator quantities are scaled from CPCB's own published rates: national average
**123.45 gm/person/day** (CPCB Annual Report on Solid Waste Management, 2021-22), with larger
Gujarat towns/cities realistically nearer **0.3–0.5 kg/person/day**. We use real approximate town
population figures × this rate to size Ahmedabad/Gandhinagar municipal generator records — not a
round invented number.

---

## 4. Real seasonality: Gujarat crop calendar

This is what actually makes the forecasting problem non-trivial — waste availability is sharply
seasonal, and the seasons differ by crop:

| Crop | Sowing | Harvest (waste becomes available) |
|---|---|---|
| Cotton | Early July | Spread Oct–Jan (picking rounds) |
| Groundnut | June–July | Oct–Nov |
| Bajra | June–July | Sep–Oct |
| Paddy (rice) | June–July (transplant) | Oct–Nov |
| Wheat | Oct–Dec (optimal Nov 1–25) | Mar–Apr |

Dairy manure has **no seasonality** (continuous daily output) — this is a deliberately useful contrast
in the training data: the forecasting model must learn that manure availability is flat while crop
residue availability is sharply bimodal (a Kharif harvest bump Oct–Nov, a Rabi bump Mar–Apr), which is
exactly the kind of feature interaction (`waste_type × month`) that justifies using a model over a
flat average.

---

## 5. Real carbon-conversion factors (biochar route)

Source: IPCC AR6 (2022) biochar guidance and peer-reviewed pyrolysis-yield literature.

- Pyrolysis (400–700°C, low-oxygen) locks roughly **50% of the feedstock's carbon** into a stable
  solid (biochar) that persists in soil for **100+ years**. Sequestration efficiency is
  reported in the 25–50% range depending on pyrolysis temperature and biochar stability, with the
  best retention around 500–550°C.
- We use the **50% feedstock-carbon-retained** figure as the central assumption (clearly labelled as
  an estimate, with the source cited in `methodology_note` on every carbon record), then convert
  carbon mass to CO₂-equivalent mass using the standard molecular-weight ratio **44/12 (CO₂/C)**.
- Biogas route uses a separate, simpler avoided-emissions assumption (methane capture avoiding both
  open decomposition and landfill methane release) — documented in the same constants file.

**We never hardcode "1 tonne waste = X tonnes CO₂" as a single universal number.** The calculation
service (`carbon_service.py`, built in Phase 8) chains: waste quantity → conversion route → conversion
output → carbon content → estimated sequestered CO₂ → minus transport emissions → net estimate. Every
step's assumption is a named, cited constant, not a literal in the calculation.

---

## 6. What is real vs. synthetic — stated plainly, for the judges

| Layer | Real or synthetic? |
|---|---|
| District-level annual crop production tonnage | **Real** (Government of India APY data) |
| RPR conversion factors | **Real** (published literature) |
| District choice / generator archetype (dairy in Anand/Mehsana, crops in Kheda, urban in Ahmedabad/Gandhinagar) | **Real regional grounding** |
| Gujarat crop calendar (sowing/harvest months) | **Real** |
| CPCB per-capita MSW rates | **Real** |
| Biochar carbon-retention assumption | **Real** (IPCC AR6) |
| Individual generator records (name, exact coordinates, month-by-month tonnage) | **Synthetic**, calibrated to sum to the real district totals above |
| Individual facility records (capacity, current load) | **Synthetic**, sized realistically against real plant examples (e.g. the cited 500 m³ Mehsana biogas plant) |

Every screen that shows generator/facility/waste-record data carries a small **"Demo / Synthetic
Data"** badge, per the product spec. The Forecast page additionally states the model is trained on
this calibrated synthetic panel, not on live government feeds — this is disclosed, not hidden.
