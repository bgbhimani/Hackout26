from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.enums import FacilityStatus, UserRole
from app.core.security import create_access_token, hash_password, verify_password
from app.database.geo import point_from_lat_lng
from app.models.facility import Facility
from app.models.user import User
from app.models.waste_generator import WasteGenerator
from app.schemas.auth import FacilityOperatorSignupRequest, WasteGeneratorSignupRequest


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def issue_token_for(user: User) -> str:
    return create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})


def register_waste_generator(db: Session, payload: WasteGeneratorSignupRequest) -> tuple[User, str]:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.WASTE_GENERATOR,
    )
    db.add(user)
    db.flush()  # populate user.id (Python-side uuid4 default, applied at flush) before using it below

    generator = WasteGenerator(
        name=payload.generator_name,
        generator_type=payload.generator_type,
        contact_name=payload.name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        location=point_from_lat_lng(payload.latitude, payload.longitude),
        user_id=user.id,
    )
    db.add(generator)

    db.commit()
    db.refresh(user)

    token = issue_token_for(user)
    return user, token


def register_facility_operator(db: Session, payload: FacilityOperatorSignupRequest) -> tuple[User, str]:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    if payload.current_load_tonnes > payload.capacity_tonnes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Current load cannot exceed total capacity",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.FACILITY_OPERATOR,
    )
    db.add(user)
    # id is a Python-side default (uuid.uuid4) applied at flush, not at
    # construction - flush now so user.id is real before it's used below as
    # the facility's owner. This owner link is what accept_match/reject_match
    # (matching_service.py) check to confirm only this operator can act on
    # matches offered to their facility.
    db.flush()

    facility = Facility(
        name=payload.facility_name,
        facility_type=payload.facility_type,
        capacity_tonnes=payload.capacity_tonnes,
        current_load_tonnes=payload.current_load_tonnes,
        accepted_waste_types=payload.accepted_waste_types,
        address=payload.address,
        location=point_from_lat_lng(payload.latitude, payload.longitude),
        status=FacilityStatus.ACTIVE,
        user_id=user.id,
    )
    db.add(facility)

    db.commit()
    db.refresh(user)

    token = issue_token_for(user)
    return user, token

