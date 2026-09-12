import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.constants.enums import GeneratorType


class GeneratorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    generator_type: GeneratorType
    contact_name: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    address: str = Field(min_length=1, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class GeneratorUpdate(BaseModel):
    """All fields optional - a PUT here is a partial update in practice
    (only provided fields are applied), which matches how the frontend's
    edit form actually submits (see EDIT_GENERATOR note in generators.py)."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    generator_type: GeneratorType | None = None
    contact_name: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    address: str | None = Field(default=None, min_length=1, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class GeneratorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    generator_type: GeneratorType
    contact_name: str | None
    phone: str | None
    email: str | None
    address: str
    latitude: float
    longitude: float
    created_at: datetime
    updated_at: datetime
