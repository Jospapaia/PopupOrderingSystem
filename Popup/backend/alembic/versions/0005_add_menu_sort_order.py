"""add sort_order to event_menu_items

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-19
"""
from __future__ import annotations
import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("event_menu_items", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))
    op.execute("""
        UPDATE event_menu_items emi
        SET sort_order = sub.rn
        FROM (
            SELECT id, (ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY id) - 1) AS rn
            FROM event_menu_items
        ) sub
        WHERE emi.id = sub.id
    """)


def downgrade() -> None:
    op.drop_column("event_menu_items", "sort_order")
