"""add max_ice_cream_total to events

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-14

"""
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: str = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("max_ice_cream_total", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "max_ice_cream_total")
