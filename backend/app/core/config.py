"""
Centralised application settings, loaded from environment variables / .env.
Nothing in this codebase should read os.environ directly outside this file -
import `settings` instead, so every config value has one documented source.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Database -----------------------------------------------------
    # Must point at a Postgres database with the PostGIS extension enabled.
    # Left blank by default so the app can still boot (e.g. for `/health`)
    # before a real database is wired up during local development.
    DATABASE_URL: str = ""

    # --- Auth -----------------------------------------------------------
    JWT_SECRET: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # --- Third-party ------------------------------------------------------
    MAPBOX_TOKEN: str = ""

    # --- CORS -------------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:3000"

    ENVIRONMENT: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
