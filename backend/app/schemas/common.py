from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Shape every error response takes, so the frontend has exactly one
    error-parsing code path (see frontend/lib/api.ts)."""

    detail: str
