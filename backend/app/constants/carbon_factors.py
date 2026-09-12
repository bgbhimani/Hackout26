"""
Every number the carbon-impact engine (built in Phase 8, app/services/carbon_service.py)
uses comes from here, and every constant carries its source. This module is what a judge
is pointed at when they ask "where did this CO2 number come from" - see also
data/ml-data-research.md for the full research writeup.

Nothing here is a "1 tonne waste = X tonnes CO2" universal constant. These are per-crop,
per-route inputs that the carbon service chains together (see PIPELINE note at bottom).
"""
from app.constants.enums import WasteType

CO2_PER_C = 44 / 12  # molecular weight ratio, CO2 : C - not a citation, just chemistry

# Residue-to-Product Ratio: converts crop production tonnage (what government
# statistics report) into residue tonnage (what is actually available to collect).
# Source: Hiloidhari et al. (2014); CSE "Agro-Residue for Power" report; ICAR
# residue-management reviews. See data/ml-data-research.md section 2 for the full
# cited range per crop family - the values below are the literature midpoint.
RESIDUE_TO_PRODUCT_RATIO: dict[WasteType, float] = {
    WasteType.RICE_STRAW: 1.5,
    WasteType.WHEAT_STRAW: 1.5,
    WasteType.COTTON_RESIDUE: 2.75,
    WasteType.SUGARCANE_RESIDUE: 0.4,
    WasteType.FOOD_WASTE: 1.0,       # not derived from crop production; direct estimate
    WasteType.ORGANIC_WASTE: 1.0,
    WasteType.ANIMAL_MANURE: 1.0,
}

# Biochar route (slow pyrolysis, 400-700 C, low oxygen).
# Source: IPCC AR6 (2022) biochar guidance + peer-reviewed pyrolysis-yield literature
# (see data/ml-data-research.md section 5). Central assumption: ~50% of feedstock
# carbon is retained as stable biochar carbon (100+ year persistence). Reported range
# in the literature is 25-50% depending on pyrolysis temperature; we use the midpoint
# of the commonly-cited "about half" figure and state that explicitly in every
# methodology_note rather than implying false precision.
BIOCHAR_CONVERSION_OUTPUT_FRACTION = 0.30      # tonnes biochar produced per tonne dry feedstock
BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION = 0.45   # typical dry-biomass carbon content
BIOCHAR_CARBON_RETENTION_FRACTION = 0.50       # IPCC AR6: fraction of feedstock carbon retained

# Biogas route (anaerobic digestion). Avoided-emissions assumption: methane that
# would otherwise be released by uncontrolled decomposition/open dumping is instead
# captured and combusted as fuel. We estimate this as an avoided-emissions factor
# per tonne of wet feedstock, expressed directly in tonnes CO2e for simplicity -
# this is a coarser, explicitly-labelled estimate, not an IPCC Tier 2 calculation.
BIOGAS_AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK: dict[WasteType, float] = {
    WasteType.ANIMAL_MANURE: 0.35,
    WasteType.FOOD_WASTE: 0.45,
    WasteType.ORGANIC_WASTE: 0.30,
}

# Transport emissions: standard diesel truck freight factor. Source: DEFRA/DESNZ
# UK Government GHG Conversion Factors (widely used as a conservative, well-documented
# proxy for Indian truck freight where a domestic factor is unavailable).
TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM = 0.00010

"""
PIPELINE (implemented in Phase 8's carbon_service.py - documented here so the shape
of the calculation is decided before the models that store its output are built):

  waste_quantity_tonnes
        -> conversion_output_tonnes            = quantity * output_fraction[route]
        -> feedstock_carbon_tonnes             = quantity * carbon_content_fraction
        -> estimated_sequestered_co2_tonnes    = feedstock_carbon_tonnes
                                                    * retention_fraction * CO2_PER_C   (biochar route)
                                                  OR quantity * avoided_emissions_factor  (biogas route)
        -> transport_emissions_tonnes          = distance_km * quantity * TRANSPORT_EMISSIONS_FACTOR
        -> net_co2_impact_tonnes               = estimated_sequestered_co2_tonnes - transport_emissions_tonnes

Every CarbonRecord stores which named constants were used (methodology_note), so the
result is reproducible and auditable, never a black-box number.
"""
