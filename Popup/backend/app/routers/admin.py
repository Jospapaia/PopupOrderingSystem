from __future__ import annotations
import os
import uuid
import shutil
from datetime import datetime, timezone, date, time, timedelta
from decimal import Decimal
from pathlib import Path
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..auth import require_admin
from ..models.models import (
    Event, Slot, EventMenuItem, Order, OrderItem, Product,
    EventStatus, OrderStatus, IceCreamMode,
)
from ..queries import booked_portions, item_booked, effective_max_ice_cream
from ..schemas import (
    ProductCreate, ProductUpdate, ProductOut,
    EventCreate, EventUpdate, EventOut,
    SlotUpdate, SlotAdminOut, OrderSummary, OrderItemSummary,
    EventMenuItemCreate, EventMenuItemUpdate, EventMenuItemOut,
    OrderOut,
)

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])

STATIC_UPLOADS = Path(__file__).parent.parent.parent / "static" / "uploads"
STATIC_UPLOADS.mkdir(parents=True, exist_ok=True)

_LOCKED_FIELDS = frozenset({"date", "start_time", "end_time", "slot_duration_min"})
BUSINESS_TZ = ZoneInfo(os.environ.get("BUSINESS_TZ", "Asia/Jerusalem"))


# ── Pure helpers ──────────────────────────────────────────────────────────────

def _build_menu_item_out(item: EventMenuItem) -> EventMenuItemOut:
    return EventMenuItemOut(
        id=item.id,
        event_id=item.event_id,
        product_id=item.product_id,
        product_name=item.product.name,
        ice_cream_mode=item.product.ice_cream_mode,
        quantity_available=item.quantity_available,
        price=item.price,
        ice_cream_addon_price=item.ice_cream_addon_price,
        is_active=item.is_active,
    )


def _assemble_slot_admin_out(
    slot: Slot,
    bk: int,
    effective_max: int,
    order_summaries: list[OrderSummary],
) -> SlotAdminOut:
    return SlotAdminOut(
        id=slot.id,
        slot_start=slot.slot_start,
        slot_end=slot.slot_end,
        max_ice_cream=slot.max_ice_cream,
        max_ice_cream_effective=effective_max,
        booked_portions=bk,
        is_full=bk >= effective_max,
        orders=order_summaries,
    )


def _build_slot_admin_out(db: Session, slot: Slot, event: Event) -> SlotAdminOut:
    bk = booked_portions(db, slot.id)
    effective_max = effective_max_ice_cream(slot, event)
    orders = db.execute(
        select(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.event_menu_item)
            .selectinload(EventMenuItem.product)
        )
        .where(Order.slot_id == slot.id)
    ).scalars().all()
    order_summaries = [
        OrderSummary(
            id=o.id,
            customer_name=o.customer_name,
            status=o.status,
            notes=o.notes,
            items=[
                OrderItemSummary(
                    product_name=oi.event_menu_item.product.name,
                    quantity=oi.quantity,
                    unit_price=oi.unit_price,
                    with_ice_cream=oi.with_ice_cream,
                )
                for oi in o.items
            ],
        )
        for o in orders
    ]
    return _assemble_slot_admin_out(slot, bk, effective_max, order_summaries)


def _generate_slot_objects(
    event_date: date,
    start_time: time,
    end_time: time,
    slot_duration_min: int,
    event_id: uuid.UUID,
) -> list[Slot]:
    start_dt = datetime.combine(event_date, start_time, tzinfo=BUSINESS_TZ)
    end_dt = datetime.combine(event_date, end_time, tzinfo=BUSINESS_TZ)
    duration = timedelta(minutes=slot_duration_min)
    total_minutes = int((end_dt - start_dt).total_seconds() / 60)
    if total_minutes <= 0 or total_minutes % slot_duration_min != 0:
        raise ValueError("time range not evenly divisible")
    slots: list[Slot] = []
    current = start_dt
    while current < end_dt:
        slots.append(Slot(event_id=event_id, slot_start=current, slot_end=current + duration))
        current += duration
    return slots


def _requires_lock_check(update_data: dict) -> bool:
    return bool(_LOCKED_FIELDS.intersection(update_data.keys()))


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db)) -> List[ProductOut]:
    return db.execute(select(Product).order_by(Product.created_at.asc())).scalars().all()


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> ProductOut:
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: uuid.UUID, payload: ProductUpdate, db: Session = Depends(get_db)) -> ProductOut:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="המוצר לא נמצא")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.post("/products/{product_id}/image", response_model=ProductOut)
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ProductOut:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="המוצר לא נמצא")

    allowed_types = {"image/jpeg", "image/png"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=422, detail="סוג הקובץ אינו נתמך — יש להעלות JPEG או PNG")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="גודל הקובץ חורג מ-5MB")

    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    filename = f"{product_id}.{ext}"
    dest = STATIC_UPLOADS / filename
    dest.write_bytes(content)

    product.image_url = f"/static/uploads/{filename}"
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204, response_model=None)
def delete_product(product_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="המוצר לא נמצא")
    count: int = db.execute(
        select(func.count()).select_from(EventMenuItem).where(EventMenuItem.product_id == product_id)
    ).scalar_one()
    if count > 0:
        raise HTTPException(status_code=409, detail="לא ניתן למחוק — המוצר משויך לאירועים קיימים")
    db.delete(product)
    db.commit()


# ── Events ────────────────────────────────────────────────────────────────────

@router.get("/events", response_model=List[EventOut])
def list_events(db: Session = Depends(get_db)) -> List[EventOut]:
    return db.execute(select(Event).order_by(Event.created_at.desc())).scalars().all()


@router.post("/events", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db)) -> EventOut:
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")
    return event


@router.patch("/events/{event_id}", response_model=EventOut)
def update_event(event_id: uuid.UUID, payload: EventUpdate, db: Session = Depends(get_db)) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")

    update_data = payload.model_dump(exclude_unset=True)
    if _requires_lock_check(update_data):
        if event.status != EventStatus.draft:
            raise HTTPException(
                status_code=409,
                detail="לא ניתן לשנות תאריך/שעות/משך סלוט לאחר פרסום האירוע",
            )
        has_orders = db.execute(
            select(func.count(Order.id))
            .where(Order.event_id == event_id, Order.status != OrderStatus.cancelled)
        ).scalar_one()
        if has_orders:
            raise HTTPException(
                status_code=409,
                detail="לא ניתן לשנות תאריך/שעות/משך סלוט לאחר קבלת הזמנות",
            )

    for field, value in update_data.items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204, response_model=None)
def delete_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")

    # Delete orders first so OrderItems (which reference EventMenuItems) are
    # removed before the cascade on Event.menu_items fires.
    orders = db.execute(select(Order).where(Order.event_id == event_id)).scalars().all()
    for order in orders:
        db.delete(order)
    db.flush()

    db.delete(event)
    db.commit()


@router.post("/events/{event_id}/publish", response_model=EventOut)
def publish_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")
    if event.status != EventStatus.draft:
        raise HTTPException(status_code=409, detail="ניתן לפרסם רק אירועים בסטטוס טיוטה")

    existing_slots = db.execute(
        select(func.count(Slot.id)).where(Slot.event_id == event_id)
    ).scalar_one()
    if existing_slots:
        raise HTTPException(status_code=409, detail="לאירוע כבר יש סלוטים")

    try:
        slots = _generate_slot_objects(
            event.date, event.start_time, event.end_time, event.slot_duration_min, event.id
        )
    except ValueError:
        raise HTTPException(
            status_code=409,
            detail="טווח הזמן אינו מתחלק בשווה — שנה את משך הסלוט או שעות הפעילות",
        )

    for slot in slots:
        db.add(slot)
    event.status = EventStatus.published
    db.commit()
    db.refresh(event)
    return event


@router.post("/events/{event_id}/complete", response_model=EventOut)
def complete_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")
    if event.status != EventStatus.published:
        raise HTTPException(status_code=409, detail="ניתן לסגור רק אירועים פעילים")
    event.status = EventStatus.completed
    db.commit()
    db.refresh(event)
    return event


@router.post("/events/{event_id}/cancel", response_model=EventOut)
def cancel_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")
    if event.status == EventStatus.completed:
        raise HTTPException(status_code=409, detail="לא ניתן לבטל אירוע שהסתיים")
    if event.status == EventStatus.cancelled:
        raise HTTPException(status_code=409, detail="האירוע כבר בוטל")
    event.status = EventStatus.cancelled
    db.commit()
    db.refresh(event)
    return event


# ── Slots ─────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/slots", response_model=List[SlotAdminOut])
def list_slots(event_id: uuid.UUID, db: Session = Depends(get_db)) -> List[SlotAdminOut]:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")
    slots = db.execute(
        select(Slot).where(Slot.event_id == event_id).order_by(Slot.slot_start.asc())
    ).scalars().all()
    return [_build_slot_admin_out(db, slot, event) for slot in slots]


@router.patch("/slots/{slot_id}", response_model=SlotAdminOut)
def update_slot(slot_id: uuid.UUID, payload: SlotUpdate, db: Session = Depends(get_db)) -> SlotAdminOut:
    slot = db.execute(select(Slot).where(Slot.id == slot_id).with_for_update()).scalar_one_or_none()
    if slot is None:
        raise HTTPException(status_code=404, detail="הסלוט לא נמצא")
    event = db.get(Event, slot.event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")
    bk = booked_portions(db, slot.id)
    if payload.max_ice_cream < bk:
        raise HTTPException(
            status_code=409,
            detail={"message": "לא ניתן להפחית קיבולת מתחת להזמנות הקיימות", "current_booked": bk},
        )
    slot.max_ice_cream = payload.max_ice_cream
    db.commit()
    db.refresh(slot)
    return _build_slot_admin_out(db, slot, event)


# ── Event Menu Items ──────────────────────────────────────────────────────────

@router.get("/events/{event_id}/menu", response_model=List[EventMenuItemOut])
def list_menu_items(event_id: uuid.UUID, db: Session = Depends(get_db)) -> List[EventMenuItemOut]:
    items = db.execute(
        select(EventMenuItem)
        .options(selectinload(EventMenuItem.product))
        .where(EventMenuItem.event_id == event_id)
    ).scalars().all()
    return [_build_menu_item_out(item) for item in items]


@router.post("/events/{event_id}/menu", response_model=EventMenuItemOut, status_code=201)
def add_menu_item(event_id: uuid.UUID, payload: EventMenuItemCreate, db: Session = Depends(get_db)) -> EventMenuItemOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="האירוע לא נמצא")
    product = db.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="המוצר לא נמצא")
    item = EventMenuItem(event_id=event_id, **payload.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="המוצר כבר קיים בתפריט האירוע")
    db.refresh(item)
    db.refresh(item.product)
    return _build_menu_item_out(item)


@router.patch("/menu-items/{item_id}", response_model=EventMenuItemOut)
def update_menu_item(item_id: uuid.UUID, payload: EventMenuItemUpdate, db: Session = Depends(get_db)) -> EventMenuItemOut:
    item = db.execute(
        select(EventMenuItem).options(selectinload(EventMenuItem.product)).where(EventMenuItem.id == item_id)
    ).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="פריט התפריט לא נמצא")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _build_menu_item_out(item)


@router.delete("/menu-items/{item_id}", status_code=204, response_model=None)
def delete_menu_item(item_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    item = db.get(EventMenuItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="פריט התפריט לא נמצא")
    has_orders = db.execute(
        select(func.count(OrderItem.id)).where(OrderItem.event_menu_item_id == item_id)
    ).scalar_one()
    if has_orders:
        raise HTTPException(status_code=409, detail="לא ניתן למחוק פריט תפריט עם הזמנות קיימות")
    db.delete(item)
    db.commit()


# ── Orders ────────────────────────────────────────────────────────────────────

@router.get("/events/{event_id}/orders", response_model=List[OrderOut])
def list_orders(event_id: uuid.UUID, db: Session = Depends(get_db)) -> List[OrderOut]:
    orders = db.execute(
        select(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.event_menu_item)
            .selectinload(EventMenuItem.product)
        )
        .where(Order.event_id == event_id)
        .order_by(Order.created_at.desc())
    ).scalars().all()
    return orders


def _load_order_with_products(db: Session, order_id: uuid.UUID) -> Order | None:
    return db.execute(
        select(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.event_menu_item)
            .selectinload(EventMenuItem.product)
        )
        .where(Order.id == order_id)
    ).scalar_one_or_none()


@router.post("/orders/{order_id}/pickup", response_model=OrderOut)
def pickup_order(order_id: uuid.UUID, db: Session = Depends(get_db)) -> OrderOut:
    order = _load_order_with_products(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="ההזמנה לא נמצאה")
    if order.status != OrderStatus.confirmed:
        raise HTTPException(status_code=409, detail="ניתן לאשר איסוף רק להזמנות מאושרות")
    order.status = OrderStatus.picked_up
    db.commit()
    db.refresh(order)
    return order


@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: uuid.UUID, db: Session = Depends(get_db)) -> OrderOut:
    order = _load_order_with_products(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="ההזמנה לא נמצאה")
    if order.status == OrderStatus.cancelled:
        raise HTTPException(status_code=409, detail="ההזמנה כבר בוטלה")
    if order.status == OrderStatus.picked_up:
        raise HTTPException(status_code=409, detail="לא ניתן לבטל הזמנה שנאספה")
    order.status = OrderStatus.cancelled
    db.commit()
    db.refresh(order)
    return order
