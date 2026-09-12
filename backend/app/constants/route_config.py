"""
Route optimizer configuration. See app/services/route_service.py for how
these are used - kept here so nothing in the solver is a bare literal.
"""
# Reuses the same rate as the matching engine's cost estimate so a "match"
# cost estimate and the eventual route's cost estimate are computed the same way.
from app.constants.matching_config import TRANSPORT_COST_PER_TONNE_KM  # noqa: F401

# Used when the request doesn't specify a vehicle capacity. Sized for a
# large bulk-transport truck/trailer of the kind actually used for
# agricultural residue and dairy-cooperative collection in India, since the
# seeded waste records represent cooperative/farm-scale monthly quantities
# (tens to hundreds of tonnes) rather than single-household pickup loads -
# see data/ml-data-research.md. A small pickup-truck-sized default would
# make almost every real seeded stop individually exceed capacity and get
# dropped, which would misrepresent the optimizer as broken rather than working.
DEFAULT_VEHICLE_CAPACITY_TONNES = 300.0

# OR-Tools works in integers, not floats. Quantities are scaled by this
# factor (tonnes -> "tenths of a tonne") before being handed to the solver,
# and distances are scaled from km to metres (i.e. x1000) - both give
# enough precision for real-world logistics without floating point in the
# constraint model, which OR-Tools' CP-SAT-based VRP solver does not accept.
DEMAND_SCALE = 10
DISTANCE_SCALE_M_PER_KM = 1000

# High enough that OR-Tools only drops a stop when it genuinely cannot fit
# under the capacity constraint, never as a cheaper alternative to a long
# detour - dropping silently to "optimize" distance would contradict the
# whole point of a collection route.
DROP_PENALTY = 10_000_000

# Real solves here have a handful of stops; this is a safety ceiling so a
# request can never hang the API, not a tuning knob for solution quality.
SOLVE_TIME_LIMIT_SECONDS = 5
