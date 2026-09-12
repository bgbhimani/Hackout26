"""
Engine/session setup. Deliberately lazy: if DATABASE_URL is not yet configured
(e.g. first `uvicorn app.main:app` boot before a real Postgres is wired up),
importing this module must NOT crash the app - only an actual attempt to use
the database should fail, with a clear error instead of a stack trace at import.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        if not settings.DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL is not set. Copy backend/.env.example to backend/.env "
                "and point it at a Postgres+PostGIS database (Neon, Supabase, or local)."
            )
        _engine = create_engine(settings.DATABASE_URL, pool_pre_ping=False, pool_size=5, pool_recycle=280)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency - yields a request-scoped session and always closes it."""
    get_engine()  # ensures _SessionLocal is initialised
    assert _SessionLocal is not None
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
