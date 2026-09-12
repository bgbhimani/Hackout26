"""
Carbon impact calculation engine. Deliberately four separate, named
functions (not one giant calculation) - each one maps to exactly one step
of the pipeline documented in app/constants/carbon_factors.py, and every
constant used is imported from there, never a bare literal here.

No step ever uses a universal "1 tonne waste = X tonnes CO2" shortcut - the
factor used depends on the specific conversion route (facility_type) and,
for the avoided-emissions routes, the specific waste_type.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.constants.carbon_factors import (
    AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK,
    BIOCHAR_CARBON_RETENTION_FRACTION,
    BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION,
    CO2_PER_C,
    CONVERSION_OUTPUT_FRACTION,
    TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM,
)
from app.constants.enums import FacilityType
from app.models.carbon_record import CarbonRecord
from app.models.facility import Facility
from app.models.waste_record import WasteRecord
from app.schemas.carbon import CarbonCalculateRequest, CarbonRecordOut


def calculate_conversion_output(waste_quantity_tonnes: float, conversion_type: FacilityType) -> float:
    """Step 1: how much usable product (biochar / digestate / processed
    biomass fuel) comes out per tonne of feedstock in. See
    CONVERSION_OUTPUT_FRACTION for the cited approximate yield per route."""
    return round(waste_quantity_tonnes * CONVERSION_OUTPUT_FRACTION[conversion_type], 2)


def calculate_sequestered_carbon(
    waste_quantity_tonnes: float, conversion_type: FacilityType, waste_type
) -> tuple[float, float, str]:
    """Step 2: returns (estimated_sequestered_co2_tonnes, carbon_content_percent,
    a methodology fragment naming exactly which route/constants were used).

    BIOCHAR is modelled as literal carbon sequestration: feedstock carbon
    content x IPCC AR6's retention fraction x the CO2:C molecular weight
    ratio. BIOGAS and BIOMASS_CONVERSION are modelled as AVOIDED emissions
    (methane capture instead of open decomposition/burning) rather than
    sequestration - a fundamentally different mechanism, so it uses a
    different, waste-type-specific factor rather than pretending the same
    carbon-content formula applies to every route."""
    if conversion_type == FacilityType.BIOCHAR:
        carbon_content_percent = BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION * 100
        feedstock_carbon_tonnes = waste_quantity_tonnes * BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION
        sequestered = feedstock_carbon_tonnes * BIOCHAR_CARBON_RETENTION_FRACTION * CO2_PER_C
        note = (
            f"Biochar route: {waste_quantity_tonnes}t feedstock x "
            f"{BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION:.0%} carbon content x "
            f"{BIOCHAR_CARBON_RETENTION_FRACTION:.0%} retention (IPCC AR6) x {CO2_PER_C:.3f} (CO2:C) "
            f"= {sequestered:.2f}t CO2e sequestered."
        )
        return round(sequestered, 2), round(carbon_content_percent, 1), note

    factor = AVOIDED_EMISSIONS_TONNES_CO2E_PER_TONNE_FEEDSTOCK.get(waste_type)
    if factor is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No avoided-emissions factor is defined for {waste_type.value}",
        )
    sequestered = waste_quantity_tonnes * factor
    # carbon_content_percent is reported for informational/comparability
    # purposes only on this route - it is NOT part of this route's formula
    # (avoided-emissions, not carbon-content-based), and the methodology
    # note says so explicitly rather than implying it was used.
    carbon_content_percent = BIOCHAR_FEEDSTOCK_CARBON_CONTENT_FRACTION * 100
    note = (
        f"{conversion_type.value.title()} route (avoided emissions, not carbon sequestration): "
        f"{waste_quantity_tonnes}t {waste_type.value} x {factor} tCO2e/t avoided-emissions factor "
        f"= {sequestered:.2f}t CO2e avoided. carbon_content_percent shown is a generic dry-biomass "
        f"reference figure, not used in this route's calculation."
    )
    return round(sequestered, 2), round(carbon_content_percent, 1), note


def calculate_transport_emissions(distance_km: float, waste_quantity_tonnes: float) -> float:
    """Step 3: standard tonne-km diesel freight factor (DEFRA/DESNZ) x the
    actual distance and quantity for this specific delivery."""
    return round(distance_km * waste_quantity_tonnes * TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM, 4)


def calculate_net_carbon_impact(estimated_sequestered_co2_tonnes: float, transport_emissions_tonnes: float) -> float:
    """Step 4: the number actually shown as the headline result - always
    labelled "Estimated CO2 impact" in the UI, never a certified offset."""
    return round(estimated_sequestered_co2_tonnes - transport_emissions_tonnes, 4)


def _distance_km(db: Session, generator, facility: Facility) -> float:
    origin_wkt = f"POINT({generator.longitude} {generator.latitude})"
    distance = db.scalar(
        select(func.ST_Distance(func.ST_GeogFromText(origin_wkt), facility.location) / 1000.0)
    )
    return float(distance)


def calculate_carbon_impact(db: Session, req: CarbonCalculateRequest) -> CarbonRecordOut:
    waste_record = db.get(WasteRecord, req.waste_record_id)
    if waste_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")

    facility = db.get(Facility, req.facility_id)
    if facility is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")

    if waste_record.waste_type not in facility.accepted_waste_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{facility.name} does not accept {waste_record.waste_type.value}",
        )

    quantity = float(waste_record.quantity_tonnes)
    conversion_type = facility.facility_type

    conversion_output = calculate_conversion_output(quantity, conversion_type)
    sequestered_co2, carbon_content_percent, sequestration_note = calculate_sequestered_carbon(
        quantity, conversion_type, waste_record.waste_type
    )
    distance_km = _distance_km(db, waste_record.generator, facility)
    transport_emissions = calculate_transport_emissions(distance_km, quantity)
    net_impact = calculate_net_carbon_impact(sequestered_co2, transport_emissions)

    methodology_note = (
        f"{sequestration_note} Transport: {distance_km:.1f}km x {quantity}t x "
        f"{TRANSPORT_EMISSIONS_TONNES_CO2E_PER_TONNE_KM} tCO2e/t-km (DEFRA/DESNZ freight factor) = "
        f"{transport_emissions:.4f}t CO2e. Net estimated impact = {sequestered_co2:.2f} - "
        f"{transport_emissions:.4f} = {net_impact:.2f}t CO2e. This is an ESTIMATE, not a certified or "
        f"verified carbon offset."
    )

    record = CarbonRecord(
        waste_record_id=waste_record.id,
        facility_id=facility.id,
        waste_quantity_tonnes=quantity,
        conversion_type=conversion_type,
        conversion_output_tonnes=conversion_output,
        carbon_content_percent=carbon_content_percent,
        estimated_sequestered_co2_tonnes=sequestered_co2,
        transport_emissions_tonnes=transport_emissions,
        net_co2_impact_tonnes=net_impact,
        methodology_note=methodology_note,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return CarbonRecordOut.model_validate(record)


def _carbon_query(db: Session):
    return db.query(CarbonRecord).options(joinedload(CarbonRecord.facility), joinedload(CarbonRecord.waste_record))


def list_carbon_records(db: Session) -> list[CarbonRecordOut]:
    records = _carbon_query(db).order_by(CarbonRecord.created_at.desc()).all()
    return [CarbonRecordOut.model_validate(r) for r in records]


def get_carbon_records_for_waste_record(db: Session, waste_record_id: uuid.UUID) -> list[CarbonRecordOut]:
    records = (
        _carbon_query(db)
        .filter(CarbonRecord.waste_record_id == waste_record_id)
        .order_by(CarbonRecord.created_at.desc())
        .all()
    )
    return [CarbonRecordOut.model_validate(r) for r in records]
