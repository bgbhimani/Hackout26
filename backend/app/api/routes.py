import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.route import RouteOptimizeRequest, RouteOut
from app.services import route_service

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.post("/optimize", response_model=RouteOut)
def optimize(req: RouteOptimizeRequest, db: Session = Depends(get_db)) -> RouteOut:
    return route_service.optimize_route(db, req)


@router.get("", response_model=list[RouteOut])
def list_routes(db: Session = Depends(get_db)) -> list[RouteOut]:
    return route_service.list_routes(db)


@router.get("/{route_id}", response_model=RouteOut)
def get_route(route_id: uuid.UUID, db: Session = Depends(get_db)) -> RouteOut:
    return route_service.get_route_or_404(db, route_id)
