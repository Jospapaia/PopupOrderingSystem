import uuid
from datetime import datetime, date as _Date, time as _Time
from decimal import Decimal
from typing import Optional, List, Annotated

from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic.functional_serializers import PlainSerializer

from .models.models import IceCreamMode, EventStatus, OrderStatus

# Decimal that serializes as a JSON number (float) so frontend receives numeric values.
# Python-side precision stays Decimal; only the JSON output converts to float.
DecimalAsFloat = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]


# ── Products ──────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    ice_cream_mode: IceCreamMode = IceCreamMode.none
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    ice_cream_mode: Optional[IceCreamMode] = None
    image_url: Optional[str] = None


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    ice_cream_mode: IceCreamMode
    image_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Events ────────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: _Date
    start_time: _Time
    end_time: _Time
    slot_duration_min: int
    max_ice_cream_per_slot: int = Field(..., ge=1)
    max_ice_cream_total: Optional[int] = Field(None, ge=1)

    @field_validator("slot_duration_min")
    @classmethod
    def duration_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("slot_duration_min must be > 0")
        return v

    @model_validator(mode="after")
    def times_ordered(self) -> "EventCreate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    max_ice_cream_per_slot: Optional[int] = Field(None, ge=1)
    max_ice_cream_total: Optional[int] = Field(None, ge=1)
    date: Optional[_Date] = None
    start_time: Optional[_Time] = None
    end_time: Optional[_Time] = None
    slot_duration_min: Optional[int] = None

    @model_validator(mode="after")
    def times_ordered(self) -> "EventUpdate":
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError("start_time must be before end_time")
        return self


class EventOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    date: _Date
    start_time: _Time
    end_time: _Time
    slot_duration_min: int
    max_ice_cream_per_slot: int
    max_ice_cream_total: Optional[int] = None
    status: EventStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Slots ─────────────────────────────────────────────────────────────────────

class SlotUpdate(BaseModel):
    max_ice_cream: int = Field(..., ge=1)


class OrderItemSummary(BaseModel):
    product_name: str
    quantity: int
    unit_price: DecimalAsFloat
    with_ice_cream: Optional[bool]

    model_config = {"from_attributes": True}


class OrderSummary(BaseModel):
    id: uuid.UUID
    customer_name: str
    status: OrderStatus
    notes: Optional[str]
    items: List[OrderItemSummary]

    model_config = {"from_attributes": True}


class SlotAdminOut(BaseModel):
    id: uuid.UUID
    slot_start: datetime
    slot_end: datetime
    max_ice_cream: Optional[int]
    max_ice_cream_effective: int
    booked_portions: int
    is_full: bool
    orders: List[OrderSummary]

    model_config = {"from_attributes": True}


class SlotPublicOut(BaseModel):
    id: uuid.UUID
    slot_start: datetime
    slot_end: datetime
    max_ice_cream_effective: int
    booked_portions: int
    is_full: bool

    model_config = {"from_attributes": True}


# ── Event Menu Items ──────────────────────────────────────────────────────────

class EventMenuItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity_available: int
    price: Decimal
    ice_cream_addon_price: Optional[Decimal] = None


class EventMenuItemUpdate(BaseModel):
    quantity_available: Optional[int] = None
    price: Optional[Decimal] = None
    ice_cream_addon_price: Optional[Decimal] = None
    is_active: Optional[bool] = None


class EventMenuItemOut(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    ice_cream_mode: IceCreamMode
    quantity_available: int
    price: DecimalAsFloat
    ice_cream_addon_price: Optional[DecimalAsFloat]
    is_active: bool

    model_config = {"from_attributes": True}


class EventMenuItemPublicOut(BaseModel):
    id: uuid.UUID
    product_name: str
    description: Optional[str] = None
    ice_cream_mode: IceCreamMode
    price: DecimalAsFloat
    ice_cream_addon_price: Optional[DecimalAsFloat]
    remaining_quantity: int
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderItemIn(BaseModel):
    event_menu_item_id: uuid.UUID
    quantity: int = Field(..., gt=0)
    with_ice_cream: Optional[bool] = None


class OrderCreate(BaseModel):
    event_id: uuid.UUID
    slot_id: Optional[uuid.UUID] = None
    customer_name: str
    notes: Optional[str] = None
    items: List[OrderItemIn]

    @field_validator("customer_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("customer_name cannot be empty")
        if len(v) > 100:
            raise ValueError("customer_name must be ≤ 100 characters")
        return v

    @field_validator("notes")
    @classmethod
    def notes_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 300:
            raise ValueError("notes must be ≤ 300 characters")
        return v



class OrderItemOut(BaseModel):
    id: uuid.UUID
    event_menu_item_id: uuid.UUID
    product_name: str
    quantity: int
    unit_price: DecimalAsFloat
    with_ice_cream: Optional[bool]

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    slot_id: Optional[uuid.UUID]
    customer_name: str
    status: OrderStatus
    notes: Optional[str]
    created_at: datetime
    items: List[OrderItemOut]

    model_config = {"from_attributes": True}


# ── About Page ───────────────────────────────────────────────────────────────

class AboutPageOut(BaseModel):
    bio_text: Optional[str] = None
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class AboutPageUpdate(BaseModel):
    bio_text: Optional[str] = None


# ── Public Event Response ─────────────────────────────────────────────────────

class UpcomingEventOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    date: _Date
    start_time: _Time
    end_time: _Time
    max_ice_cream_total: Optional[int] = None
    ice_cream_total_remaining: Optional[int] = None
    slots: List[SlotPublicOut]
    menu_items: List[EventMenuItemPublicOut]

    model_config = {"from_attributes": True}


class UpcomingEventResponse(BaseModel):
    event: Optional[UpcomingEventOut]
