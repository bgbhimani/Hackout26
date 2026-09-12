import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import AuthenticatedUser, get_current_user, require_role
from app.constants.enums import UserRole
from app.database.session import get_db
from app.schemas.facility import FacilityCreate, FacilityOut, FacilityUpdate
from app.services import facility_service

router = APIRouter(prefix="/api/facilities", tags=["facilities"])

_WRITE_ROLES = (UserRole.ADMIN, UserRole.FACILITY_OPERATOR)


@router.get("", response_model=list[FacilityOut])
def list_facilities(db: Session = Depends(get_db)) -> list[FacilityOut]:
    return facility_service.list_facilities(db)  # type: ignore[return-value]


# NOTE: declared before GET /{facility_id} - FastAPI matches path templates
# in declaration order, and a bare {facility_id} segment would otherwise
# swallow "mine" as an attempted (invalid) UUID, per the same gotcha
# documented in app/api/matching.py and app/api/generators.py.
@router.get("/mine", response_model=list[FacilityOut])
def list_my_facilities(
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(get_current_user),
) -> list[FacilityOut]:
    """Every facility this user owns - what a Facility Operator's Operations
    Map uses to show only their own facility, not every competitor's."""
    return facility_service.list_own_facilities(db, current.id)  # type: ignore[return-value]


@router.post("", response_model=FacilityOut, status_code=status.HTTP_201_CREATED)
def create_facility(
    payload: FacilityCreate,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(*_WRITE_ROLES)),
) -> FacilityOut:
    owner_id = current.id if current.role == UserRole.FACILITY_OPERATOR else None
    return facility_service.create_facility(db, payload, owner_id=owner_id)  # type: ignore[return-value]


@router.get("/{facility_id}", response_model=FacilityOut)
def get_facility(facility_id: uuid.UUID, db: Session = Depends(get_db)) -> FacilityOut:
    return facility_service.get_facility_or_404(db, facility_id)  # type: ignore[return-value]


@router.put("/{facility_id}", response_model=FacilityOut)
def update_facility(
    facility_id: uuid.UUID,
    payload: FacilityUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(*_WRITE_ROLES)),
) -> FacilityOut:
    return facility_service.update_facility(db, facility_id, payload)  # type: ignore[return-value]
