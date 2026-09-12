from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import every model so Base.metadata is fully populated before autogenerate
# runs, and pull the real connection string from our own settings object
# rather than duplicating it in alembic.ini.
import app.models  # noqa: F401
from app.core.config import settings
from app.database.base import Base

if not settings.DATABASE_URL:
    raise SystemExit(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and "
        "point it at a Postgres+PostGIS database before running Alembic."
    )

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # PostGIS registers its own `spatial_ref_sys` table; never let
        # autogenerate try to drop it.
        include_object=lambda obj, name, type_, reflected, compare_to: not (
            type_ == "table" and name == "spatial_ref_sys"
        ),
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=lambda obj, name, type_, reflected, compare_to: not (
                type_ == "table" and name == "spatial_ref_sys"
            ),
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
