from __future__ import annotations
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models.models import (
    Event, Slot, EventMenuItem, Order, OrderItem, Product, AboutPage,
    EventStatus, OrderStatus, IceCreamMode,
)
from ..queries import booked_portions, item_booked, effective_max_ice_cream, ice_cream_count_for_item
from ..schemas import (
    OrderCreate, OrderOut, OrderItemIn, UpcomingEventResponse, UpcomingEventOut,
    SlotPublicOut, EventMenuItemPublicOut, AboutPageOut,
)

router = APIRouter()


# ── Pure helpers (no DB access, easily unit-testable) ─────────────────────────

def _compute_new_ice_cream_qty(
    items: list[OrderItemIn],
    menu_items_map: dict[uuid.UUID, EventMenuItem],
) -> int:
    total = 0
    for item_in in items:
        if item_in.quantity <= 0:
            continue
        emi = menu_items_map[item_in.event_menu_item_id]
        total += ice_cream_count_for_item(emi.product.ice_cream_mode, item_in.with_ice_cream, item_in.quantity)
    return total


def _compute_unit_price(emi: EventMenuItem, with_ice_cream: bool | None) -> Decimal:
    if (
        emi.product.ice_cream_mode == IceCreamMode.optional
        and with_ice_cream
        and emi.ice_cream_addon_price is not None
    ):
        return Decimal(str(emi.price)) + Decimal(str(emi.ice_cream_addon_price))
    return Decimal(str(emi.price))


def _is_slot_in_past(slot_start: datetime, now: datetime) -> bool:
    slot_start_utc = (
        slot_start.replace(tzinfo=timezone.utc)
        if slot_start.tzinfo is None
        else slot_start
    )
    return slot_start_utc < now


# ── Routes ────────────────────────────────────────────────────────────────────

def _get_upcoming_event_data(db: Session, today: date) -> UpcomingEventResponse:
    event = db.execute(
        select(Event)
        .where(Event.status == EventStatus.published, Event.date >= today)
        .order_by(Event.date.asc(), Event.start_time.asc(), Event.created_at.asc())
        .limit(1)
    ).scalar_one_or_none()

    if event is None:
        return UpcomingEventResponse(event=None)

    slots_rows = db.execute(
        select(Slot)
        .where(Slot.event_id == event.id)
        .order_by(Slot.slot_start.asc())
    ).scalars().all()

    menu_items_rows = db.execute(
        select(EventMenuItem)
        .options(selectinload(EventMenuItem.product))
        .where(
            EventMenuItem.event_id == event.id,
            EventMenuItem.is_active == True,
        )
    ).scalars().all()

    slots_out: List[SlotPublicOut] = []
    for slot in slots_rows:
        bk = booked_portions(db, slot.id)
        effective_max = effective_max_ice_cream(slot, event)
        slots_out.append(SlotPublicOut(
            id=slot.id,
            slot_start=slot.slot_start,
            slot_end=slot.slot_end,
            max_ice_cream_effective=effective_max,
            booked_portions=bk,
            is_full=bk >= effective_max,
        ))

    menu_out: List[EventMenuItemPublicOut] = []
    for item in menu_items_rows:
        bk = item_booked(db, item.id)
        remaining = max(0, item.quantity_available - bk)
        menu_out.append(EventMenuItemPublicOut(
            id=item.id,
            product_name=item.product.name,
            description=item.product.description,
            ice_cream_mode=item.product.ice_cream_mode,
            price=item.price,
            ice_cream_addon_price=item.ice_cream_addon_price,
            remaining_quantity=remaining,
            image_url=item.product.image_url,
        ))

    total_booked = sum(s.booked_portions for s in slots_out)
    ice_cream_total_remaining: int | None = None
    if event.max_ice_cream_total is not None:
        ice_cream_total_remaining = max(0, event.max_ice_cream_total - total_booked)

    return UpcomingEventResponse(
        event=UpcomingEventOut(
            id=event.id,
            title=event.title,
            description=event.description,
            date=event.date,
            start_time=event.start_time,
            end_time=event.end_time,
            max_ice_cream_total=event.max_ice_cream_total,
            ice_cream_total_remaining=ice_cream_total_remaining,
            slots=slots_out,
            menu_items=menu_out,
        )
    )


@router.get("/events/upcoming", response_model=UpcomingEventResponse)
def get_upcoming_event(db: Session = Depends(get_db)) -> UpcomingEventResponse:
    return _get_upcoming_event_data(db, date.today())


def _create_order(db: Session, payload: OrderCreate, now: datetime) -> OrderOut:
    if not payload.items:
        raise HTTPException(status_code=400, detail="הזמנה חייבת לכלול לפחות פריט אחד")

    event = db.get(Event, payload.event_id)
    if event is None:
        raise HTTPException(status_code=400, detail="האירוע לא נמצא")
    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="הזמנות אפשריות רק לאירועים פעילים")

    item_ids = [i.event_menu_item_id for i in payload.items]
    menu_items_map: dict[uuid.UUID, EventMenuItem] = {}
    for emi_id in item_ids:
        emi = db.get(EventMenuItem, emi_id)
        if emi is None or emi.event_id != event.id:
            raise HTTPException(status_code=400, detail=f"פריט {emi_id} אינו בתפריט האירוע")
        if not emi.is_active:
            raise HTTPException(status_code=400, detail=f"פריט {emi.product.name} אינו זמין")
        menu_items_map[emi_id] = emi

    needs_slot = _compute_new_ice_cream_qty(payload.items, menu_items_map) > 0

    slot: Optional[Slot] = None
    if needs_slot:
        if payload.slot_id is None:
            raise HTTPException(status_code=400, detail="נדרש לבחור סלוט עבור הזמנה עם גלידה")
        slot = db.get(Slot, payload.slot_id)
        if slot is None or slot.event_id != event.id:
            raise HTTPException(status_code=400, detail="הסלוט שנבחר אינו תקף")
        if _is_slot_in_past(slot.slot_start, now):
            raise HTTPException(status_code=400, detail="לא ניתן להזמין לסלוט שעבר")

    # Atomic: lock slot + each menu item row with SELECT FOR UPDATE.
    # Concurrent orders for the same slot or item block here until this transaction
    # commits, so booked_portions and item_booked reflect only committed state.
    if slot is not None:
        locked_slot = db.execute(
            select(Slot).where(Slot.id == slot.id).with_for_update()
        ).scalar_one()
        effective_max = effective_max_ice_cream(locked_slot, event)
        current_booked = booked_portions(db, locked_slot.id)
        new_ice_cream_qty = _compute_new_ice_cream_qty(payload.items, menu_items_map)
        if current_booked + new_ice_cream_qty > effective_max:
            raise HTTPException(status_code=409, detail="הסלוט מלא — אנא בחר סלוט אחר")

    # Aggregate quantities per menu item (same item may appear twice for split ice-cream orders)
    from collections import defaultdict
    total_qty_per_item: dict[uuid.UUID, int] = defaultdict(int)
    for item_in in payload.items:
        total_qty_per_item[item_in.event_menu_item_id] += item_in.quantity

    seen_for_capacity: set[uuid.UUID] = set()
    for item_in in payload.items:
        emi_id = item_in.event_menu_item_id
        if emi_id in seen_for_capacity:
            continue
        seen_for_capacity.add(emi_id)
        locked_emi = db.execute(
            select(EventMenuItem).where(EventMenuItem.id == emi_id).with_for_update()
        ).scalar_one()
        bk = item_booked(db, locked_emi.id)
        if bk + total_qty_per_item[emi_id] > locked_emi.quantity_available:
            raise HTTPException(status_code=409, detail=f"הפריט {locked_emi.product.name} אזל מהמלאי")

    order = Order(
        event_id=event.id,
        slot_id=slot.id if slot else None,
        customer_name=payload.customer_name,
        status=OrderStatus.confirmed,
        notes=payload.notes or None,
    )
    db.add(order)
    db.flush()

    order_items = []
    for item_in in payload.items:
        emi = menu_items_map[item_in.event_menu_item_id]
        unit_price = _compute_unit_price(emi, item_in.with_ice_cream)
        oi = OrderItem(
            order_id=order.id,
            event_menu_item_id=emi.id,
            quantity=item_in.quantity,
            unit_price=unit_price,
            with_ice_cream=item_in.with_ice_cream,
            used_ice_cream=ice_cream_count_for_item(emi.product.ice_cream_mode, item_in.with_ice_cream, item_in.quantity) > 0,
        )
        db.add(oi)
        order_items.append(oi)

    db.commit()

    # Reload with product names for OrderItemOut.product_name
    loaded = db.execute(
        select(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.event_menu_item)
            .selectinload(EventMenuItem.product)
        )
        .where(Order.id == order.id)
    ).scalar_one()
    return loaded


@router.get("/about", response_model=AboutPageOut)
def get_about(db: Session = Depends(get_db)) -> AboutPageOut:
    about = db.get(AboutPage, 1)
    return about or AboutPageOut()


@router.post("/orders", response_model=OrderOut, status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)) -> OrderOut:
    return _create_order(db, payload, datetime.now(timezone.utc))
