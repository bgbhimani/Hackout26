from pydantic import BaseModel, Field


class MapsLinkExpandRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class MapsLinkExpandResponse(BaseModel):
    resolved_url: str
