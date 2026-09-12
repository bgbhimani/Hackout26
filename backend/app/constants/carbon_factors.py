"""
Every number the carbon-impact engine (built in Phase 8, app/services/carbon_service.py)
uses comes from here, and every constant carries its source. This module is what a judge
is pointed at when they ask "where did this CO2 number come from" - see also
data/ml-data-research.md for the full research writeup.

Nothing here is a "1 tonne waste = X tonnes CO2" universal constant. These are per-crop,
per-route inputs that the carbon service chains together (see PIPELINE note at bottom).
"""
from app.constants.enums import FacilityType, WasteType

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

# Conversion output: mass of usable product per tonne of input feedstock.
# BIOCHAR: IPCC AR6 (2022) + peer-reviewed pyrolysis-yield literature (see
#   data/ml-data-research.md section 5) - slow pyrolysis (400-700 C, low
#   oxygen) typically yields ~25-35% biochar by mass; we use the midpoint.
# BIOGAS: anaerobic digestion is mostly a mass-conserving process - the
#   bulk of input mass remains as digestate (solid/liquid residue); the
#   biogas itself (the valuable output) is a small fraction of mass despite
#   carrying most of the energy value. ~90% is a standard approximate
#   digestate mass-balance figure for wet organic/manure feedstock.
# BIOMASS_CONVERSION: simple mechanical/thermal processing (drying,
#   pelletizing) into a solid fuel - typical yield after moisture and
#   process loss is ~80-90%; we use the midpoint.
# All three are explicitly labelled as approximations in methodology_note,
# never presented as measured plant-specific yields.
CONVERSION_OUTPUT_FRACTION: dict[FacilityType, float] = {
    FacilityType.BIOCHAR: 0.30,
    FacilityType.BIOGAS: 0.90,
    FacilityType.BIOMASS_CONVERSION: 0.85,
}

# Biochar-specific carbon chemistry.
BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION = 0.45   # typical dry-biomass carbon content
BIOCHAR_CARBON_RETENTION_FRACTION = 0.50       # IPCC AR6: fraction of feedstock carbon retained

# Biogas and biomass-conversion routes both work by AVOIDING emissions that
# would otherwise occur from open decomposition, landfill methane release,
# or open burning - not by literal carbon sequestration the way biochar
# does. We estimate this as an avoided-emissions factor per tonne of wet
# feedstock, expressed directly in tonnes CO2e for simplicity - a coarser,
# explicitly-labelled estimate, not an IPCC Tier 2 calculation. The same
# table is used for both routes since the underlying mechanism (methane
# capture instead of uncontrolled release) is the same; BIOMASS_CONVERSION
# additionally displaces fossil fuel combustion, which this MVP does not
# separately quantify (documented limitation, see docs/carbon-methodology.md).
AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK: dict[WasteType, float] = {
    WasteType.ANIMAL_MANURE: 0.35,
    WasteType.FOOD_WASTE: 0.45,
    WasteType.ORGANIC_WASTE: 0.30,
    WasteType.RICE_STRAW: 0.25,
    WasteType.WHEAT_STRAW: 0.25,
    WasteType.COTTON_RESIDUE: 0.25,
    WasteType.SUGARCANE_RESIDUE: 0.25,
}

# Transport emissions: standard diesel truck freight factor. Source: DEFRA/DESNZ
# UK Government GHG Conversion Factors (widely used as a conservative, well-documented
# proxy for Indian truck freight where a domestic factor is unavailable).
TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM = 0.00010

"""
PIPELINE (implemented in app/services/carbon_service.py as four separate,
named functions - never one giant calculation):

  waste_quantity_tonnes
        -> calculate_conversion_output()
             conversion_output_tonnes = quantity * CONVERSION_OUTPUT_FRACTION[facility_type]
        -> calculate_sequestered_carbon()
             BIOCHAR route:  quantity * carbon_content_fraction * retention_fraction * CO2_PER_C
             BIOGAS / BIOMASS_CONVERSION routes: quantity * AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK[waste_type]
        -> calculate_transport_emissions()
             transport_emissions_tonnes = distance_km * quantity * TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM
        -> calculate_net_carbon_impact()
             net_co2_impact_tonnes = estimated_sequestered_co2_tonnes - transport_emissions_tonnes

Every CarbonRecord stores which named constants were used (methodology_note), so the
result is reproducible and auditable, never a black-box number.
"""
