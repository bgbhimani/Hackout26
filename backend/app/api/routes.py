import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.constants.enums import UserRole
from app.database.session import get_db
from app.schemas.route import RouteOptimizeRequest, RouteOut
from app.services import route_service

router = APIRouter(prefix="/api/routes", tags=["routes"])

# Pre-existing gap fixed alongside the confirmation flow: this endpoint had no
# role gate at all, so any authenticated user (including a Waste Generator)
# could optimize a route for any facility. Only the facility operator who
# actually runs the depot (or an admin) should trigger this.
_OPTIMIZE_ROLES = (UserRole.ADMIN, UserRole.FACILITY_OPERATOR)


@router.post("/optimize", response_model=RouteOut)
def optimize(
    req: RouteOptimizeRequest,
    db: Session = Depends(get_db),
    _=Depends(require_role(*_OPTIMIZE_ROLES)),
) -> RouteOut:
    return route_service.optimize_route(db, req)


@router.get("", response_model=list[RouteOut])
def list_routes(db: Session = Depends(get_db)) -> list[RouteOut]:
    return route_service.list_routes(db)


@router.get("/{route_id}", response_model=RouteOut)
def get_route(route_id: uuid.UUID, db: Session = Depends(get_db)) -> RouteOut:
    return route_service.get_route_or_404(db, route_id)
