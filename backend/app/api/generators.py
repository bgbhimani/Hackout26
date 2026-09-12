import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import AuthenticatedUser, get_current_user, require_role
from app.constants.enums import UserRole
from app.database.session import get_db
from app.schemas.generator import GeneratorCreate, GeneratorOut, GeneratorUpdate
from app.services import generator_service

router = APIRouter(prefix="/api/generators", tags=["generators"])

# Everyone authenticated can read; only admins and the generator role itself
# manage the roster - matches the spec's "WASTE_GENERATOR: manage own waste
# information" without building a per-row ownership model the hackathon
# doesn't need. (The one exception is GET /mine below, which does need real
# per-row ownership - see waste_generators.user_id.)
_WRITE_ROLES = (UserRole.ADMIN, UserRole.WASTE_GENERATOR)


@router.get("", response_model=list[GeneratorOut])
def list_generators(db: Session = Depends(get_db)) -> list[GeneratorOut]:
    return generator_service.list_generators(db)  # type: ignore[return-value]


# NOTE: declared before GET /{generator_id} - FastAPI matches path templates
# in declaration order, and a bare {generator_id} segment would otherwise
# swallow "mine" as an attempted (invalid) UUID, per the same gotcha
# documented in app/api/matching.py.
@router.get("/mine", response_model=list[GeneratorOut])
def list_my_generators(
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(get_current_user),
) -> list[GeneratorOut]:
    """Every generator entity this user owns - one from signup, plus any
    more they've registered themselves since (a Waste Generator isn't
    limited to exactly one farm/site). What a Waste Generator's map and
    "My Farms & Sites" list (frontend) use, instead of the whole network's
    roster mislabeled as theirs."""
    return generator_service.list_own_generators(db, current.id)  # type: ignore[return-value]


@router.post("", response_model=GeneratorOut, status_code=status.HTTP_201_CREATED)
def create_generator(
    payload: GeneratorCreate,
    db: Session = Depends(get_db),
    current: AuthenticatedUser = Depends(require_role(*_WRITE_ROLES)),
) -> GeneratorOut:
    # A Waste Generator self-registering a farm/site owns it; an ADMIN
    # adding one on someone's behalf leaves it unowned, same as the seeded
    # network-wide roster.
    owner_id = current.id if current.role == UserRole.WASTE_GENERATOR else None
    return generator_service.create_generator(db, payload, owner_id=owner_id)  # type: ignore[return-value]


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
    _=Depends(require_role(*_WRITE_ROLES)),
) -> None:
    generator_service.delete_generator(db, generator_id)
