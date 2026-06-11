"""add default_quantity and default_price to products

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-11
"""
from __future__ import annotations
import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("default_quantity", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("default_price", sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "default_price")
    op.drop_column("products", "default_quantity")
