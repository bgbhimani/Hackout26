"""add negotiation (counter-offer/bargaining) to matches

Revision ID: 2ad0c530a71f
Revises: 22b6a07e6399
Create Date: 2026-09-13 01:23:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2ad0c530a71f'
down_revision: Union[str, None] = '22b6a07e6399'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # match_status: RECOMMENDED meant "sent, awaiting facility" all along -
    # renaming it to REQUESTED just makes that explicit now that /recommend
    # no longer auto-persists anything (sending a request is a separate,
    # explicit action). Existing rows keep their meaning unchanged.
    # Every statement here is guarded so this is safe to run whether
    # RECOMMENDED still exists (fresh DB) or was already renamed (e.g. a
    # prior attempt got this far before failing later in the script).
    # ADD VALUE can't be used in the same transaction it runs in, so it (and
    # the rename, for consistency) run in an autocommit block.
    with op.get_context().autocommit_block():
        op.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'match_status' AND e.enumlabel = 'RECOMMENDED'
                ) THEN
                    EXECUTE 'ALTER TYPE match_status RENAME VALUE ''RECOMMENDED'' TO ''REQUESTED''';
                END IF;
            END$$;
            """
        )
        op.execute("ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'COUNTERED'")
        op.execute("ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'WITHDRAWN'")

    # create_type=False on both: they're created explicitly exactly once
    # below (checkfirst=True), rather than letting SQLAlchemy try to
    # auto-create them again the moment they're reused on a second column/
    # table in this same migration (which raises "type already exists").
    offer_party = postgresql.ENUM('GENERATOR', 'FACILITY', name='offer_party', create_type=False)
    offer_action = postgresql.ENUM(
        'REQUEST', 'COUNTER', 'ACCEPT', 'REJECT', 'WITHDRAW', name='offer_action', create_type=False
    )
    offer_party.create(bind, checkfirst=True)
    offer_action.create(bind, checkfirst=True)

    # Current outstanding terms on a match - see app/models/match.py. Every
    # existing match was created by the old auto-persist recommend flow, so
    # last_offer_by=GENERATOR/offer_round=1 correctly describes them too.
    for column_name, column in [
        ("last_offer_by", sa.Column('last_offer_by', offer_party, nullable=False, server_default='GENERATOR')),
        ("offer_price", sa.Column('offer_price', sa.Numeric(precision=12, scale=2), nullable=True)),
        ("offer_pickup_date", sa.Column('offer_pickup_date', sa.Date(), nullable=True)),
        ("offer_note", sa.Column('offer_note', sa.String(length=1000), nullable=True)),
        ("offer_round", sa.Column('offer_round', sa.Integer(), nullable=False, server_default='1')),
    ]:
        if not bind.execute(
            sa.text(
                "SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = :c"
            ),
            {"c": column_name},
        ).scalar():
            op.add_column('matches', column)

    if not bind.execute(
        sa.text("SELECT 1 FROM information_schema.tables WHERE table_name = 'match_offers'")
    ).scalar():
        op.create_table(
            'match_offers',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('match_id', sa.UUID(), nullable=False),
            sa.Column('offered_by', offer_party, nullable=False),
            sa.Column('action', offer_action, nullable=False),
            sa.Column('offer_price', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('offer_pickup_date', sa.Date(), nullable=True),
            sa.Column('note', sa.String(length=1000), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(
                ['match_id'], ['matches.id'], name=op.f('fk_match_offers_match_id_matches'), ondelete='CASCADE'
            ),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_match_offers')),
        )
        op.create_index(op.f('ix_match_offers_match_id'), 'match_offers', ['match_id'], unique=False)

        # Backfill one REQUEST offer per pre-existing match so its
        # negotiation thread isn't empty - it really did start with an
        # implicit request.
        op.execute(
            """
            INSERT INTO match_offers (id, match_id, offered_by, action, created_at)
            SELECT gen_random_uuid(), id, 'GENERATOR', 'REQUEST', created_at FROM matches
            """
        )


def downgrade() -> None:
    op.drop_index(op.f('ix_match_offers_match_id'), table_name='match_offers')
    op.drop_table('match_offers')
    op.drop_column('matches', 'offer_round')
    op.drop_column('matches', 'offer_note')
    op.drop_column('matches', 'offer_pickup_date')
    op.drop_column('matches', 'offer_price')
    op.drop_column('matches', 'last_offer_by')

    sa.Enum(name='offer_action').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='offer_party').drop(op.get_bind(), checkfirst=True)

    # Postgres has no ALTER TYPE ... DROP VALUE - reversing the rename is all
    # that's practical here; COUNTERED/WITHDRAWN values are left in place
    # (harmless if unused) rather than rebuilding the whole enum/column.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE match_status RENAME VALUE 'REQUESTED' TO 'RECOMMENDED'")
