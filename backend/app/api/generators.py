import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.constants.enums import UserRole
from app.database.session import get_db
from app.schemas.generator import GeneratorCreate, GeneratorOut, GeneratorUpdate
from app.services import generator_service

router = APIRouter(prefix="/api/generators", tags=["generators"])

# Everyone authenticated can read; only admins and the generator role itself
# manage the roster - matches the spec's "WASTE_GENERATOR: manage own waste
# information" without building a per-row ownership model the hackathon
# doesn't need.
_WRITE_ROLES = (UserRole.ADMIN, UserRole.WASTE_GENERATOR)


@router.get("", response_model=list[GeneratorOut])
def list_generators(db: Session = Depends(get_db)) -> list[GeneratorOut]:
    return generator_service.list_generators(db)  # type: ignore[return-value]


@router.post("", response_model=GeneratorOut, status_code=status.HTTP_201_CREATED)
def create_generator(
    payload: GeneratorCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(*_WRITE_ROLES)),
) -> GeneratorOut:
    return generator_service.create_generator(db, payload)  # type: ignore[return-value]


@router.get("/{generator_id}", response_model=GeneratorOut)
def get_generator(generator_id: uuid.UUID, db: Session = Depends(get_db)) -> GeneratorOut:
    return generator_service.get_generator_or_404(db, generator_id)  # type: ignore[return-value]


@router.put("/{generator_id}", response_model=GeneratorOut)
def update_generator(
    generator_id: uuid.UUID,
    payload: GeneratorUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(*_WRITE_ROLES)),
) -> GeneratorOut:
    return generator_service.update_generator(db, generator_id, payload)  # type: ignore[return-value]


@router.delete("/{generator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_generator(
    generator_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_role(UserRole.ADMIN)),
) -> None:
    generator_service.delete_generator(db, generator_id)
