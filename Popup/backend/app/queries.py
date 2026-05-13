from __future__ import annotations
import uuid

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from .models.models import Order, OrderItem, Event, Slot, OrderStatus, IceCreamMode


def booked_portions(db: Session, slot_id: uuid.UUID) -> int:
    result: int | None = db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.slot_id == slot_id,
            Order.status != OrderStatus.cancelled,
            OrderItem.used_ice_cream == True,
        )
    ).scalar()
    return int(result or 0)


def item_booked(db: Session, event_menu_item_id: uuid.UUID) -> int:
    result: int | None = db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            OrderItem.event_menu_item_id == event_menu_item_id,
            Order.status != OrderStatus.cancelled,
        )
    ).scalar()
    return int(result or 0)


def effective_max_ice_cream(slot: Slot, event: Event) -> int:
    return slot.max_ice_cream if slot.max_ice_cream is not None else event.max_ice_cream_per_slot


def ice_cream_count_for_item(mode: IceCreamMode, with_ice_cream: bool | None, quantity: int) -> int:
    if mode == IceCreamMode.included:
        return quantity
    if mode == IceCreamMode.optional and with_ice_cream:
        return quantity
    return 0
