import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.constants.enums import RouteStatus


class RouteOptimizeRequest(BaseModel):
    facility_id: uuid.UUID
    waste_record_ids: list[uuid.UUID] = Field(min_length=1)
    vehicle_capacity_tonnes: float | None = Field(default=None, gt=0)


class RouteStopOut(BaseModel):
    stop_order: int
    generator_id: uuid.UUID
    generator_name: str
    latitude: float
    longitude: float
    quantity_tonnes: float
    waste_record_ids: list[uuid.UUID]


class DroppedStop(BaseModel):
    generator_id: uuid.UUID
    generator_name: str
    quantity_tonnes: float
    reason: str


class RouteOut(BaseModel):
    id: uuid.UUID
    facility_id: uuid.UUID
    facility_name: str
    vehicle_capacity_tonnes: float
    total_distance_km: float
    estimated_transport_cost: float
    total_waste_tonnes: float
    status: RouteStatus
    stops: list[RouteStopOut]
    # [lat, lng] pairs in visit order, facility first and last (round trip) -
    # exactly what the frontend needs for a Leaflet Polyline, no GeoJSON
    # parsing required on either side.
    path: list[list[float]]
    dropped_stops: list[DroppedStop]
    # Non-null when the route's total collected tonnage exceeds the
    # facility's current available capacity - a real, checked constraint,
    # surfaced rather than silently ignored or made to look infeasible.
    facility_capacity_warning: str | None
    created_at: datetime
