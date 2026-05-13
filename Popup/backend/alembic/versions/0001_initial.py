"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enum types
    ice_cream_mode_enum = postgresql.ENUM("none", "included", "optional", name="ice_cream_mode_enum")
    event_status_enum = postgresql.ENUM("draft", "published", "completed", "cancelled", name="event_status")
    order_status_enum = postgresql.ENUM("confirmed", "picked_up", "cancelled", name="order_status")

    ice_cream_mode_enum.create(op.get_bind(), checkfirst=True)
    event_status_enum.create(op.get_bind(), checkfirst=True)
    order_status_enum.create(op.get_bind(), checkfirst=True)

    # products
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "ice_cream_mode",
            postgresql.ENUM("none", "included", "optional", name="ice_cream_mode_enum", create_type=False),
            nullable=False,
            server_default="none",
        ),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # events
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_duration_min", sa.Integer(), nullable=False),
        sa.Column("max_ice_cream_per_slot", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM("draft", "published", "completed", "cancelled", name="event_status", create_type=False),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # slots
    op.create_table(
        "slots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_ice_cream", sa.Integer(), nullable=True),
    )
    op.create_index("ix_slots_event_id", "slots", ["event_id"])

    # event_menu_items
    op.create_table(
        "event_menu_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity_available", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("ice_cream_addon_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.UniqueConstraint("event_id", "product_id", name="uq_event_product"),
    )

    # orders
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("slot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("slots.id"), nullable=True),
        sa.Column("customer_name", sa.String(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM("confirmed", "picked_up", "cancelled", name="order_status", create_type=False),
            nullable=False,
            server_default="confirmed",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_orders_event_id", "orders", ["event_id"])
    op.create_index("ix_orders_slot_id", "orders", ["slot_id"])

    # order_items
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_menu_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event_menu_items.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("with_ice_cream", sa.Boolean(), nullable=True),
        sa.Column("used_ice_cream", sa.Boolean(), nullable=False, server_default="false"),
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_event_menu_item_id", "order_items", ["event_menu_item_id"])


def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("event_menu_items")
    op.drop_table("slots")
    op.drop_table("events")
    op.drop_table("products")

    op.execute("DROP TYPE IF EXISTS ice_cream_mode_enum")
    op.execute("DROP TYPE IF EXISTS event_status")
    op.execute("DROP TYPE IF EXISTS order_status")
