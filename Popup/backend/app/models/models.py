import enum
import uuid
from datetime import datetime, date, time
from decimal import Decimal

from sqlalchemy import (
    String, Text, Integer, Numeric, Boolean, Date, Time,
    DateTime, ForeignKey, UniqueConstraint, CheckConstraint, Index,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
from sqlalchemy.sql import func


class IceCreamMode(str, enum.Enum):
    none = "none"
    included = "included"
    optional = "optional"


class EventStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    completed = "completed"
    cancelled = "cancelled"


class OrderStatus(str, enum.Enum):
    confirmed = "confirmed"
    picked_up = "picked_up"
    cancelled = "cancelled"


class Base(DeclarativeBase):
    pass


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ice_cream_mode: Mapped[IceCreamMode] = mapped_column(
        SAEnum(IceCreamMode, name="ice_cream_mode_enum", create_type=True),
        nullable=False,
        default=IceCreamMode.none,
    )
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event_menu_items = relationship("EventMenuItem", back_populates="product")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    max_ice_cream_per_slot: Mapped[int] = mapped_column(Integer, nullable=False)
    max_ice_cream_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        SAEnum(EventStatus, name="event_status", create_type=True),
        nullable=False,
        default=EventStatus.draft,
    )
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    slots = relationship("Slot", back_populates="event", cascade="all, delete-orphan")
    menu_items = relationship("EventMenuItem", back_populates="event", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="event")


class Slot(Base):
    __tablename__ = "slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    slot_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    slot_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    max_ice_cream: Mapped[int | None] = mapped_column(Integer, nullable=True)

    event = relationship("Event", back_populates="slots")
    orders = relationship("Order", back_populates="slot")

    __table_args__ = (
        Index("ix_slots_event_id", "event_id"),
    )


class EventMenuItem(Base):
    __tablename__ = "event_menu_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity_available: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    ice_cream_addon_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    event = relationship("Event", back_populates="menu_items")
    product = relationship("Product", back_populates="event_menu_items")
    order_items = relationship("OrderItem", back_populates="event_menu_item")

    __table_args__ = (
        UniqueConstraint("event_id", "product_id", name="uq_event_product"),
    )


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    slot_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("slots.id"), nullable=True)
    customer_name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name="order_status", create_type=True),
        nullable=False,
        default=OrderStatus.confirmed,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="orders")
    slot = relationship("Slot", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_orders_event_id", "event_id"),
        Index("ix_orders_slot_id", "slot_id"),
    )


class AboutPage(Base):
    __tablename__ = "about_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bio_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    event_menu_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("event_menu_items.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    with_ice_cream: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    used_ice_cream: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    order = relationship("Order", back_populates="items")
    event_menu_item = relationship("EventMenuItem", back_populates="order_items")

    @property
    def product_name(self) -> str:
        return self.event_menu_item.product.name

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        Index("ix_order_items_order_id", "order_id"),
        Index("ix_order_items_event_menu_item_id", "event_menu_item_id"),
    )
