"""
Pure unit tests for the carbon calculation engine - no database. Verifies
the exact formulas in app/services/carbon_service.py against the cited
constants in app/constants/carbon_factors.py (see docs/carbon-methodology.md).
"""
import pytest

from app.constants.carbon_factors import (
    AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK,
    BIOCHAR_CARBON_RETENTION_FRACTION,
    BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION,
    CO2_PER_C,
    CONVERSION_OUTPUT_FRACTION,
    TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM,
)
from app.constants.enums import FacilityType, WasteType
from app.services.carbon_service import (
    calculate_conversion_output,
    calculate_net_carbon_impact,
    calculate_sequestered_carbon,
    calculate_transport_emissions,
)


def test_avoided_emissions_table_covers_every_waste_type():
    """If a new WasteType is ever added without a matching factor here,
    calculate_sequestered_carbon raises a 422 for every biogas/biomass
    request using it - this test catches that at development time instead."""
    for wt in WasteType:
        assert wt in AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK


@pytest.mark.parametrize("facility_type", list(FacilityType))
def test_conversion_output_scales_linearly_with_quantity(facility_type):
    fraction = CONVERSION_OUTPUT_FRACTION[facility_type]
    assert calculate_conversion_output(100, facility_type) == pytest.approx(100 * fraction)
    assert calculate_conversion_output(0, facility_type) == 0


def test_biochar_sequestration_matches_documented_formula():
    quantity = 243.0
    sequestered, carbon_content_percent, note = calculate_sequestered_carbon(
        quantity, FacilityType.BIOCHAR, WasteType.RICE_STRAW
    )
    expected = quantity * BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION * BIOCHAR_CARBON_RETENTION_FRACTION * CO2_PER_C
    assert sequestered == pytest.approx(round(expected, 2))
    assert carbon_content_percent == pytest.approx(BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION * 100)
    assert "IPCC AR6" in note


def test_biogas_uses_avoided_emissions_not_carbon_content_formula():
    """Biogas and biomass-conversion routes are a fundamentally different
    mechanism from biochar (avoided emissions, not sequestration) - this
    test is the guard against ever silently reusing the biochar formula
    for these routes, which docs/carbon-methodology.md explicitly forbids."""
    quantity = 154.3
    sequestered, _, note = calculate_sequestered_carbon(quantity, FacilityType.BIOGAS, WasteType.ANIMAL_MANURE)
    expected = quantity * AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK[WasteType.ANIMAL_MANURE]
    assert sequestered == pytest.approx(round(expected, 2))
    assert "avoided emissions" in note.lower()
    assert "not used in this route" in note.lower()


def test_biomass_conversion_also_uses_avoided_emissions():
    quantity = 360.2
    sequestered, _, _ = calculate_sequestered_carbon(quantity, FacilityType.BIOMASS_CONVERSION, WasteType.COTTON_RESIDUE)
    expected = quantity * AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK[WasteType.COTTON_RESIDUE]
    assert sequestered == pytest.approx(round(expected, 2))


def test_transport_emissions_scales_with_distance_and_quantity():
    result = calculate_transport_emissions(distance_km=100, waste_quantity_tonnes=10)
    expected = 100 * 10 * TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM
    assert result == pytest.approx(expected)


def test_transport_emissions_zero_distance_is_zero():
    assert calculate_transport_emissions(distance_km=0, waste_quantity_tonnes=500) == 0


def test_net_impact_subtracts_transport_from_sequestered():
    assert calculate_net_carbon_impact(estimated_sequestered_co2_tonnes=100, transport_emissions_tonnes=5) == 95


def test_net_impact_can_go_negative_for_very_long_transport():
    """Honest math: if transport swamps the benefit, net impact should show
    that plainly rather than floor at zero and hide it."""
    result = calculate_net_carbon_impact(estimated_sequestered_co2_tonnes=1, transport_emissions_tonnes=50)
    assert result < 0
