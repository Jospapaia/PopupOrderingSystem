"""add about_page table

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-19

"""
from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: str = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "about_page",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("bio_text", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("INSERT INTO about_page (id) VALUES (1)")


def downgrade() -> None:
    op.drop_table("about_page")
