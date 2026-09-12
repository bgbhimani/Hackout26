import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.constants.enums import (
    FACILITY_WASTE_COMPATIBILITY,
    FacilityType,
    GeneratorType,
    UserRole,
    WasteType,
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut | None" = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole


class WasteGeneratorSignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    generator_name: str = Field(min_length=1, max_length=200)
    generator_type: GeneratorType
    phone: str | None = Field(default=None, max_length=30)
    address: str = Field(min_length=1, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class FacilityOperatorSignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    facility_name: str = Field(min_length=1, max_length=200)
    facility_type: FacilityType
    capacity_tonnes: float = Field(gt=0)
    current_load_tonnes: float = Field(default=0, ge=0)
    accepted_waste_types: list[WasteType] = Field(min_length=1)
    address: str = Field(min_length=1, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    @field_validator("accepted_waste_types")
    @classmethod
    def _validate_compatibility(cls, v: list[WasteType], info) -> list[WasteType]:
        facility_type = info.data.get("facility_type")
        if facility_type is None:
            return v
        allowed = set(FACILITY_WASTE_COMPATIBILITY.get(facility_type, []))
        invalid = [w for w in v if w not in allowed]
        if invalid:
            raise ValueError(
                f"{facility_type.value} facilities cannot accept: {', '.join(w.value for w in invalid)}"
            )
        return v

