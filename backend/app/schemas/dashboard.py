from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_waste_available_tonnes: float
    waste_diverted_tonnes: float
    active_facilities: int
    active_routes: int
    estimated_co2_impact_tonnes: float


class MonthlyQuantity(BaseModel):
    month: str  # "YYYY-MM"
    quantity_tonnes: float


class WasteTypeQuantity(BaseModel):
    waste_type: str
    quantity_tonnes: float


class FacilityUtilization(BaseModel):
    facility_name: str
    utilization_percent: float


class MonthlyCarbonImpact(BaseModel):
    month: str
    net_co2_impact_tonnes: float


class DashboardAnalytics(BaseModel):
    waste_availability_over_time: list[MonthlyQuantity]
    waste_by_type: list[WasteTypeQuantity]
    waste_diverted_over_time: list[MonthlyQuantity]
    facility_utilization: list[FacilityUtilization]
    carbon_impact_over_time: list[MonthlyCarbonImpact]
