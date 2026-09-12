"""
Every number here is a real aggregation query against the tables Phase 2
seeded (and, once Phases 6/8 are built, against routes/carbon_records too -
until then those two are honestly zero/empty, never a placeholder number).
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants.enums import FacilityStatus, RouteStatus, WasteStatus
from app.models.carbon_record import CarbonRecord
from app.models.facility import Facility
from app.models.route import Route
from app.models.waste_record import WasteRecord
from app.schemas.dashboard import (
    DashboardAnalytics,
    DashboardSummary,
    FacilityUtilization,
    MonthlyCarbonImpact,
    MonthlyQuantity,
    WasteTypeQuantity,
)

_DIVERTED_STATUSES = (WasteStatus.COLLECTED, WasteStatus.PROCESSED)


def get_summary(db: Session) -> DashboardSummary:
    total_available = db.scalar(
        select(func.coalesce(func.sum(WasteRecord.quantity_tonnes), 0)).where(
            WasteRecord.status == WasteStatus.AVAILABLE
        )
    )
    waste_diverted = db.scalar(
        select(func.coalesce(func.sum(WasteRecord.quantity_tonnes), 0)).where(
            WasteRecord.status.in_(_DIVERTED_STATUSES)
        )
    )
    active_facilities = db.scalar(
        select(func.count()).select_from(Facility).where(Facility.status == FacilityStatus.ACTIVE)
    )
    active_routes = db.scalar(
        select(func.count()).select_from(Route).where(
            Route.status.in_((RouteStatus.PLANNED, RouteStatus.IN_PROGRESS))
        )
    )
    co2_impact = db.scalar(select(func.coalesce(func.sum(CarbonRecord.net_co2_impact_tonnes), 0)))

    return DashboardSummary(
        total_waste_available_tonnes=float(total_available),
        waste_diverted_tonnes=float(waste_diverted),
        active_facilities=int(active_facilities),
        active_routes=int(active_routes),
        estimated_co2_impact_tonnes=float(co2_impact),
    )


def _monthly_quantity(db: Session, *statuses: WasteStatus) -> list[MonthlyQuantity]:
    month_expr = func.to_char(WasteRecord.available_from, "YYYY-MM")
    rows = db.execute(
        select(month_expr.label("month"), func.sum(WasteRecord.quantity_tonnes).label("total"))
        .where(WasteRecord.status.in_(statuses))
        .group_by(month_expr)
        .order_by(month_expr)
    ).all()
    return [MonthlyQuantity(month=r.month, quantity_tonnes=float(r.total)) for r in rows]


def get_analytics(db: Session) -> DashboardAnalytics:
    waste_by_type_rows = db.execute(
        select(WasteRecord.waste_type, func.sum(WasteRecord.quantity_tonnes).label("total"))
        .group_by(WasteRecord.waste_type)
        .order_by(func.sum(WasteRecord.quantity_tonnes).desc())
    ).all()

    facility_rows = db.execute(select(Facility.name, Facility.capacity_tonnes, Facility.current_load_tonnes)).all()

    month_expr = func.to_char(CarbonRecord.created_at, "YYYY-MM")
    carbon_rows = db.execute(
        select(month_expr.label("month"), func.sum(CarbonRecord.net_co2_impact_tonnes).label("total"))
        .group_by(month_expr)
        .order_by(month_expr)
    ).all()

    return DashboardAnalytics(
        waste_availability_over_time=_monthly_quantity(db, WasteStatus.AVAILABLE),
        waste_by_type=[
            WasteTypeQuantity(waste_type=r.waste_type.value, quantity_tonnes=float(r.total))
            for r in waste_by_type_rows
        ],
        waste_diverted_over_time=_monthly_quantity(db, *_DIVERTED_STATUSES),
        facility_utilization=[
            FacilityUtilization(
                facility_name=r.name,
                utilization_percent=round((float(r.current_load_tonnes) / float(r.capacity_tonnes)) * 100, 1)
                if r.capacity_tonnes
                else 0.0,
            )
            for r in facility_rows
        ],
        carbon_impact_over_time=[
            MonthlyCarbonImpact(month=r.month, net_co2_impact_tonnes=float(r.total)) for r in carbon_rows
        ],
    )
