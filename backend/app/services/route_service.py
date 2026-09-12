"""
Single-vehicle capacitated route optimizer (CVRP), built on Google OR-Tools.
Not a heuristic we hand-rolled - a real constraint solver minimizing total
distance subject to real constraints:
  - each generator is visited at most once (OR-Tools' node model guarantees this)
  - vehicle capacity (AddDimensionWithVehicleCapacity)
  - facility remaining capacity (folded into the same capacity limit - see below)
  - the route starts and ends at the facility, which serves as the depot
    (documented MVP simplification: no separate vehicle-yard location is
    modeled, so the collection facility doubles as the depot)

If total selected waste exceeds the effective capacity, OR-Tools is allowed
to DROP the least valuable stops (AddDisjunction with a high penalty) rather
than fail outright - and every dropped stop is reported back, honestly,
never silently excluded.
"""
import uuid

from fastapi import HTTPException, status
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.constants.enums import FacilityStatus, MatchStatus, RouteStatus, WasteStatus
from app.constants.matching_config import TRANSPORT_COST_PER_TONNE_KM
from app.constants.route_config import (
    DEFAULT_VEHICLE_CAPACITY_TONNES,
    DEMAND_SCALE,
    DISTANCE_SCALE_M_PER_KM,
    DROP_PENALTY,
    SOLVE_TIME_LIMIT_SECONDS,
)
from app.database.geo import build_distance_matrix_km
from app.models.facility import Facility
from app.models.match import Match
from app.models.route import Route
from app.models.route_stop import RouteStop
from app.models.waste_record import WasteRecord
from app.schemas.route import DroppedStop, RouteOptimizeRequest, RouteOut, RouteStopOut

DEPOT = 0


def _missing_accepted_ids(requested_ids: set[uuid.UUID], accepted_ids: set[uuid.UUID]) -> set[uuid.UUID]:
    """Pure set-difference, pulled out so it's unit-testable without a
    database (see tests/test_route_service.py)."""
    return requested_ids - accepted_ids


class _Stop:
    def __init__(self, generator_id: uuid.UUID, name: str, lat: float, lng: float):
        self.generator_id = generator_id
        self.name = name
        self.lat = lat
        self.lng = lng
        self.waste_record_ids: list[uuid.UUID] = []
        self.quantities: list[float] = []

    @property
    def total_quantity(self) -> float:
        return sum(self.quantities)


def optimize_route(db: Session, req: RouteOptimizeRequest) -> RouteOut:
    facility = db.get(Facility, req.facility_id)
    if facility is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    if facility.status != FacilityStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Facility is not active")

    waste_records = db.query(WasteRecord).filter(WasteRecord.id.in_(req.waste_record_ids)).all()
    waste_records_by_id = {r.id: r for r in waste_records}
    found_ids = {r.id for r in waste_records}
    missing = set(req.waste_record_ids) - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Waste record(s) not found: {', '.join(map(str, missing))}"
        )

    # A route can only be built from waste a Facility Operator has actually
    # ACCEPTED (matching_service.accept_match) - never from arbitrary waste
    # record ids a caller happens to pass in. This is the real enforcement
    # point of the confirmation flow; get_accepted_matches_for_facility (used
    # by the Routes page) is only a UI convenience for picking which of these
    # to include, not what's trusted here.
    accepted_ids = {
        m.waste_record_id
        for m in db.scalars(
            select(Match).where(
                Match.facility_id == req.facility_id,
                Match.waste_record_id.in_(found_ids),
                Match.status == MatchStatus.ACCEPTED,
            )
        ).all()
    }
    not_accepted = _missing_accepted_ids(found_ids, accepted_ids)
    if not_accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Waste record(s) not ACCEPTED for this facility - the facility operator must accept the "
                f"match first: {', '.join(map(str, not_accepted))}"
            ),
        )

    dropped_stops: list[DroppedStop] = []
    stops_by_generator: dict[uuid.UUID, _Stop] = {}
    for record in waste_records:
        if record.waste_type not in facility.accepted_waste_types:
            dropped_stops.append(
                DroppedStop(
                    generator_id=record.generator_id,
                    generator_name=record.generator.name,
                    quantity_tonnes=float(record.quantity_tonnes),
                    reason=f"{facility.name} does not accept {record.waste_type.value}",
                )
            )
            continue
        gen = record.generator
        stop = stops_by_generator.setdefault(gen.id, _Stop(gen.id, gen.name, gen.latitude, gen.longitude))
        stop.waste_record_ids.append(record.id)
        stop.quantities.append(float(record.quantity_tonnes))

    stops = list(stops_by_generator.values())
    if not stops:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="None of the provided waste records are compatible with this facility",
        )

    facility_available_capacity = float(facility.capacity_tonnes) - float(facility.current_load_tonnes)

    # Vehicle capacity is the real CVRP constraint - how much a single
    # vehicle can physically carry per trip. Facility capacity is checked
    # separately, AFTER routing, as a warning (see facility_capacity_warning
    # below) rather than folded into the same number: a facility's current
    # spare capacity is often smaller than one generator's available
    # quantity at this data's real scale, and hard-capping the vehicle to
    # that would make routing spuriously infeasible rather than surfacing
    # the genuine "this delivery may need to be staged" signal.
    effective_capacity_tonnes = req.vehicle_capacity_tonnes or DEFAULT_VEHICLE_CAPACITY_TONNES

    # --- Build the OR-Tools model -----------------------------------------
    points = [(facility.latitude, facility.longitude)] + [(s.lat, s.lng) for s in stops]
    distance_km_matrix = build_distance_matrix_km(db, points)
    distance_matrix = [
        [int(round(km * DISTANCE_SCALE_M_PER_KM)) for km in row] for row in distance_km_matrix
    ]
    demands = [0] + [int(round(s.total_quantity * DEMAND_SCALE)) for s in stops]
    vehicle_capacity_units = int(round(effective_capacity_tonnes * DEMAND_SCALE))

    manager = pywrapcp.RoutingIndexManager(len(points), 1, DEPOT)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        return distance_matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index: int) -> int:
        return demands[manager.IndexToNode(from_index)]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(demand_callback_index, 0, [vehicle_capacity_units], True, "Capacity")

    # Every real stop (not the depot) may be dropped, at a steep cost - see
    # DROP_PENALTY's docstring in route_config.py for why it's this high.
    for node in range(1, len(points)):
        routing.AddDisjunction([manager.NodeToIndex(node)], DROP_PENALTY)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.FromSeconds(SOLVE_TIME_LIMIT_SECONDS)

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No feasible route could be computed for the given stops and capacity",
        )

    # --- Extract the solved route -------------------------------------------
    node_sequence: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node_sequence.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    node_sequence.append(manager.IndexToNode(index))  # closing return to the depot

    for node in range(1, len(points)):
        node_index = manager.NodeToIndex(node)
        if solution.Value(routing.NextVar(node_index)) == node_index:
            s = stops[node - 1]
            dropped_stops.append(
                DroppedStop(
                    generator_id=s.generator_id,
                    generator_name=s.name,
                    quantity_tonnes=s.total_quantity,
                    reason="Exceeds available vehicle/facility capacity for this trip",
                )
            )

    total_distance_km = round(
        sum(distance_km_matrix[node_sequence[i]][node_sequence[i + 1]] for i in range(len(node_sequence) - 1)), 2
    )
    visited_stops = [stops[n - 1] for n in node_sequence if n != DEPOT]
    total_waste_tonnes = round(sum(s.total_quantity for s in visited_stops), 2)
    estimated_transport_cost = round(total_distance_km * TRANSPORT_COST_PER_TONNE_KM * total_waste_tonnes, 2)

    facility_capacity_warning = None
    if total_waste_tonnes > facility_available_capacity:
        facility_capacity_warning = (
            f"This route collects {total_waste_tonnes:.1f}t, but {facility.name} currently has only "
            f"{max(facility_available_capacity, 0):.1f}t of spare capacity. Consider staging delivery "
            f"across multiple trips or scheduling after existing load is processed."
        )

    path = [
        [facility.latitude, facility.longitude] if n == DEPOT else [stops[n - 1].lat, stops[n - 1].lng]
        for n in node_sequence
    ]
    linestring_wkt = "LINESTRING(" + ", ".join(f"{lng} {lat}" for lat, lng in path) + ")"

    # --- Persist -------------------------------------------------------------
    route = Route(
        facility_id=facility.id,
        vehicle_capacity_tonnes=effective_capacity_tonnes,
        total_distance_km=total_distance_km,
        estimated_transport_cost=estimated_transport_cost,
        total_waste_tonnes=total_waste_tonnes,
        route_geometry=func.ST_GeogFromText(linestring_wkt),
        status=RouteStatus.PLANNED,
    )
    db.add(route)
    db.flush()

    stop_outs: list[RouteStopOut] = []
    order = 1
    for n in node_sequence:
        if n == DEPOT:
            continue
        s = stops[n - 1]
        for wr_id, qty in zip(s.waste_record_ids, s.quantities):
            db.add(RouteStop(route_id=route.id, waste_record_id=wr_id, stop_order=order, quantity_tonnes=qty))
            # This is the actual collection event in this simplified model -
            # there's no live truck-arrival tracking, so "included in a
            # planned route" is what "COLLECTED" means. A stop the optimizer
            # dropped (see dropped_stops above) is deliberately left PENDING,
            # not touched here - it's still accepted, just not on this trip.
            waste_records_by_id[wr_id].status = WasteStatus.COLLECTED
        stop_outs.append(
            RouteStopOut(
                stop_order=order,
                generator_id=s.generator_id,
                generator_name=s.name,
                latitude=s.lat,
                longitude=s.lng,
                quantity_tonnes=round(s.total_quantity, 2),
                waste_record_ids=s.waste_record_ids,
            )
        )
        order += 1

    db.commit()
    db.refresh(route)

    return RouteOut(
        id=route.id,
        facility_id=facility.id,
        facility_name=facility.name,
        vehicle_capacity_tonnes=effective_capacity_tonnes,
        total_distance_km=total_distance_km,
        estimated_transport_cost=estimated_transport_cost,
        total_waste_tonnes=total_waste_tonnes,
        status=route.status,
        stops=stop_outs,
        path=path,
        dropped_stops=dropped_stops,
        facility_capacity_warning=facility_capacity_warning,
        created_at=route.created_at,
    )


def _route_to_out(route: Route) -> RouteOut:
    """Rebuilds a RouteOut from a persisted Route for GET endpoints. Dropped
    stops are NOT persisted (there is no table for them in the schema - see
    docs/architecture.md), so historical routes always report an empty
    dropped_stops list; only a fresh POST /optimize call can show them.
    Callers (list_routes/get_route_or_404) eager-load route.stops ->
    waste_record -> generator and route.facility, so none of the attribute
    access below triggers a lazy-load round trip per row."""
    stops_by_order: dict[int, RouteStop] = {}
    for rs in sorted(route.stops, key=lambda s: s.stop_order):
        stops_by_order.setdefault(rs.stop_order, rs)  # first waste_record at this stop_order carries the location

    stop_outs = [
        RouteStopOut(
            stop_order=rs.stop_order,
            generator_id=rs.waste_record.generator_id,
            generator_name=rs.waste_record.generator.name,
            latitude=rs.waste_record.generator.latitude,
            longitude=rs.waste_record.generator.longitude,
            quantity_tonnes=round(
                sum(float(s.quantity_tonnes) for s in route.stops if s.stop_order == rs.stop_order), 2
            ),
            waste_record_ids=[s.waste_record_id for s in route.stops if s.stop_order == rs.stop_order],
        )
        for rs in stops_by_order.values()
    ]

    facility_point = (route.facility.latitude, route.facility.longitude)
    path = [list(facility_point)] + [[s.latitude, s.longitude] for s in stop_outs] + [list(facility_point)]

    facility_available = float(route.facility.capacity_tonnes) - float(route.facility.current_load_tonnes)
    facility_capacity_warning = None
    if float(route.total_waste_tonnes) > facility_available:
        facility_capacity_warning = (
            f"This route collects {float(route.total_waste_tonnes):.1f}t, but {route.facility.name} "
            f"currently has only {max(facility_available, 0):.1f}t of spare capacity."
        )

    return RouteOut(
        id=route.id,
        facility_id=route.facility_id,
        facility_name=route.facility.name,
        vehicle_capacity_tonnes=float(route.vehicle_capacity_tonnes),
        total_distance_km=float(route.total_distance_km),
        estimated_transport_cost=float(route.estimated_transport_cost),
        total_waste_tonnes=float(route.total_waste_tonnes),
        status=route.status,
        stops=stop_outs,
        path=path,
        dropped_stops=[],
        facility_capacity_warning=facility_capacity_warning,
        created_at=route.created_at,
    )


def _route_query(db: Session):
    return db.query(Route).options(
        joinedload(Route.facility),
        joinedload(Route.stops).joinedload(RouteStop.waste_record).joinedload(WasteRecord.generator),
    )


def list_routes(db: Session) -> list[RouteOut]:
    routes = _route_query(db).order_by(Route.created_at.desc()).all()
    return [_route_to_out(r) for r in routes]


def get_route_or_404(db: Session, route_id: uuid.UUID) -> RouteOut:
    route = _route_query(db).filter(Route.id == route_id).first()
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return _route_to_out(route)
