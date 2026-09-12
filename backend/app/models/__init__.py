"""
Importing this module registers every model on Base.metadata, which is what
Alembic's env.py needs for autogenerate to see the full schema. Import order
matters only in that every model referenced by a string-quoted relationship
(e.g. Mapped["WasteRecord"]) must be importable - it does not, since SQLAlchemy
resolves those lazily via the shared registry.
"""
from app.models.carbon_record import CarbonRecord
from app.models.facility import Facility
from app.models.forecast import Forecast
from app.models.match import Match
from app.models.route import Route
from app.models.route_stop import RouteStop
from app.models.user import User
from app.models.waste_generator import WasteGenerator
from app.models.waste_record import WasteRecord

__all__ = [
    "CarbonRecord",
    "Facility",
    "Forecast",
    "Match",
    "Route",
    "RouteStop",
    "User",
    "WasteGenerator",
    "WasteRecord",
]
