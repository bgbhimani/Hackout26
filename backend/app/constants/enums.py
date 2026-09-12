"""
Every fixed vocabulary in the system lives here as a single source of truth,
shared by SQLAlchemy models (app/models/*), Pydantic schemas (app/schemas/*)
and - via the generated OpenAPI schema - the frontend's TypeScript types.
"""
import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    WASTE_GENERATOR = "WASTE_GENERATOR"
    FACILITY_OPERATOR = "FACILITY_OPERATOR"


class GeneratorType(str, enum.Enum):
    FARM = "FARM"
    FOOD_INDUSTRY = "FOOD_INDUSTRY"
    MUNICIPALITY = "MUNICIPALITY"
    INDUSTRIAL = "INDUSTRIAL"


class WasteType(str, enum.Enum):
    RICE_STRAW = "RICE_STRAW"
    WHEAT_STRAW = "WHEAT_STRAW"
    COTTON_RESIDUE = "COTTON_RESIDUE"
    SUGARCANE_RESIDUE = "SUGARCANE_RESIDUE"
    FOOD_WASTE = "FOOD_WASTE"
    ORGANIC_WASTE = "ORGANIC_WASTE"
    ANIMAL_MANURE = "ANIMAL_MANURE"


class WasteStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PENDING = "PENDING"
    COLLECTED = "COLLECTED"
    PROCESSED = "PROCESSED"


class FacilityType(str, enum.Enum):
    BIOCHAR = "BIOCHAR"
    BIOGAS = "BIOGAS"
    BIOMASS_CONVERSION = "BIOMASS_CONVERSION"


class FacilityStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"


class MatchStatus(str, enum.Enum):
    # A Waste Generator has sent this facility a request; awaiting a first
    # response (accept/reject/counter). Renamed from the old RECOMMENDED -
    # recommend_facilities() no longer persists anything, so every persisted
    # Match now genuinely means "someone requested this", never just "shown".
    REQUESTED = "REQUESTED"
    # One side has proposed different terms (price/pickup date) and it's the
    # other side's turn - see Match.last_offer_by.
    COUNTERED = "COUNTERED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    # The requesting generator cancelled it before either side accepted.
    WITHDRAWN = "WITHDRAWN"


class OfferParty(str, enum.Enum):
    """Which side of a Match negotiation made a given offer/response."""

    GENERATOR = "GENERATOR"
    FACILITY = "FACILITY"


class OfferAction(str, enum.Enum):
    """One entry in a Match's negotiation thread (see MatchOffer)."""

    REQUEST = "REQUEST"
    COUNTER = "COUNTER"
    ACCEPT = "ACCEPT"
    REJECT = "REJECT"
    WITHDRAW = "WITHDRAW"


class RouteStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


# Which waste types a given facility type can realistically accept. Used both
# to seed realistic demo data and to validate `accepted_waste_types` input.
FACILITY_WASTE_COMPATIBILITY: dict[FacilityType, list[WasteType]] = {
    FacilityType.BIOCHAR: [
        WasteType.RICE_STRAW,
        WasteType.WHEAT_STRAW,
        WasteType.COTTON_RESIDUE,
        WasteType.SUGARCANE_RESIDUE,
    ],
    FacilityType.BIOGAS: [
        WasteType.ANIMAL_MANURE,
        WasteType.FOOD_WASTE,
        WasteType.ORGANIC_WASTE,
    ],
    FacilityType.BIOMASS_CONVERSION: [
        WasteType.RICE_STRAW,
        WasteType.WHEAT_STRAW,
        WasteType.COTTON_RESIDUE,
        WasteType.SUGARCANE_RESIDUE,
        WasteType.ORGANIC_WASTE,
    ],
}
