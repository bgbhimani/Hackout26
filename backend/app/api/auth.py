from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_full
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    FacilityOperatorSignupRequest,
    LoginRequest,
    TokenResponse,
    UserOut,
    WasteGeneratorSignupRequest,
)
from app.services.auth_service import (
    authenticate_user,
    issue_token_for,
    register_facility_operator,
    register_waste_generator,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(
        access_token=issue_token_for(user),
        user=UserOut.model_validate(user),
    )


@router.post("/register/generator", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_generator(payload: WasteGeneratorSignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user, token = register_waste_generator(db, payload)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.post("/register/facility", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_facility(payload: FacilityOperatorSignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user, token = register_facility_operator(db, payload)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user_full)) -> User:
    return current_user

