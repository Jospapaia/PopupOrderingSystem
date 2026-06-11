"""add survey stage to events

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-11
"""
from __future__ import annotations
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op
import uuid

revision: str = "0006"
down_revision: str = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extend the event_status enum with the new 'survey' value
    op.execute("ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'survey'")

    # Add survey-related columns to events
    op.add_column("events", sa.Column("survey_ends_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("events", sa.Column("menu_size", sa.Integer(), nullable=True))

    # survey_votes: one row per product per voter per event
    op.create_table(
        "survey_votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("voter_name", sa.String(), nullable=False),
        sa.Column("browser_token", sa.String(), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_survey_votes_event_id", "survey_votes", ["event_id"])
    op.create_unique_constraint(
        "uq_survey_vote_token_product",
        "survey_votes",
        ["event_id", "browser_token", "product_id"],
    )

    # survey_fixed_products: products guaranteed to be in the menu regardless of votes
    op.create_table(
        "survey_fixed_products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_unique_constraint(
        "uq_survey_fixed_event_product",
        "survey_fixed_products",
        ["event_id", "product_id"],
    )


def downgrade() -> None:
    op.drop_table("survey_fixed_products")
    op.drop_table("survey_votes")
    op.drop_column("events", "menu_size")
    op.drop_column("events", "survey_ends_at")
    # PostgreSQL does not support removing enum values; downgrade leaves the enum as-is
