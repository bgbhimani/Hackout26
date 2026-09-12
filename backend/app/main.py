"""
FastAPI application entrypoint.

Phase 1 wires up: CORS, a `/health` check that does not touch the database
(so it works even before DATABASE_URL is configured), consistent error
responses, and authentication. Phase 2 adds generators/waste/facilities CRUD.
Later phases add the remaining routers (forecast, matching, routes, carbon,
dashboard) - see docs/architecture.md for the phase plan.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import router as auth_router
from app.api.carbon import router as carbon_router
from app.api.dashboard import router as dashboard_router
from app.api.facilities import router as facilities_router
from app.api.forecast import router as forecast_router
from app.api.generators import router as generators_router
from app.api.matching import router as matching_router
from app.api.routes import router as routes_router
from app.api.waste import router as waste_router
from app.core.config import settings

app = FastAPI(
    title="Waste-to-Carbon Value Chain Tracker API",
    description="Connects waste generators with carbon-conversion facilities: "
    "predicts waste availability, matches it to suitable facilities, optimizes "
    "collection routes, and estimates the resulting CO2 impact.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Every error response has the same {"detail": "..."} shape, matching
    ErrorResponse in app/schemas/common.py, regardless of which route raised it."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.ENVIRONMENT}


app.include_router(auth_router)
app.include_router(generators_router)
app.include_router(waste_router)
app.include_router(facilities_router)
app.include_router(dashboard_router)
app.include_router(matching_router)
app.include_router(routes_router)
app.include_router(forecast_router)
app.include_router(carbon_router)
