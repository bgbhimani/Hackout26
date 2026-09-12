"""enable postgis extension

This has to be its own migration, run before anything that uses a Geography
column, because PostGIS registers types (and the spatial_ref_sys table) that
SQLAlchemy's autogenerate does not - and cannot - manage itself.

Revision ID: 3dce37b6e80c
Revises:
Create Date: 2026-09-12

"""
from typing import Sequence, Union

from alembic import op

revision: str = "3dce37b6e80c"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS postgis;")
