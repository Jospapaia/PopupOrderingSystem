"""Unit tests for pure helper functions — no DB or HTTP required."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, date, time
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.models.models import IceCreamMode
from app.queries import ice_cream_count_for_item, effective_max_ice_cream
from app.routers.public import (
    _compute_new_ice_cream_qty,
    _compute_unit_price,
    _is_slot_in_past,
)
from app.routers.admin import _generate_slot_objects, _assemble_slot_admin_out
from app.schemas import OrderItemIn


# ── ice_cream_count_for_item ──────────────────────────────────────────────────

def test_ice_cream_count_included():
    assert ice_cream_count_for_item(IceCreamMode.included, None, 3) == 3

def test_ice_cream_count_included_ignores_with_flag():
    assert ice_cream_count_for_item(IceCreamMode.included, False, 2) == 2

def test_ice_cream_count_optional_with():
    assert ice_cream_count_for_item(IceCreamMode.optional, True, 2) == 2

def test_ice_cream_count_optional_without():
    assert ice_cream_count_for_item(IceCreamMode.optional, False, 2) == 0

def test_ice_cream_count_optional_none():
    assert ice_cream_count_for_item(IceCreamMode.optional, None, 1) == 0

def test_ice_cream_count_none():
    assert ice_cream_count_for_item(IceCreamMode.none, None, 5) == 0


# ── effective_max_ice_cream ───────────────────────────────────────────────────

def _slot(max_ice_cream):
    s = MagicMock()
    s.max_ice_cream = max_ice_cream
    return s

def _event(default_max):
    e = MagicMock()
    e.max_ice_cream_per_slot = default_max
    return e

def test_effective_max_uses_slot_when_set():
    assert effective_max_ice_cream(_slot(3), _event(10)) == 3

def test_effective_max_falls_back_to_event():
    assert effective_max_ice_cream(_slot(None), _event(10)) == 10


# ── _compute_unit_price ───────────────────────────────────────────────────────

def _emi(mode, price, addon=None):
    product = MagicMock()
    product.ice_cream_mode = mode
    emi = MagicMock()
    emi.product = product
    emi.price = Decimal(str(price))
    emi.ice_cream_addon_price = Decimal(str(addon)) if addon is not None else None
    return emi

def test_compute_unit_price_none_mode():
    assert _compute_unit_price(_emi(IceCreamMode.none, "10.00"), None) == Decimal("10.00")

def test_compute_unit_price_included_mode():
    assert _compute_unit_price(_emi(IceCreamMode.included, "15.00"), None) == Decimal("15.00")

def test_compute_unit_price_optional_with_ice_cream():
    assert _compute_unit_price(_emi(IceCreamMode.optional, "10.00", "5.00"), True) == Decimal("15.00")

def test_compute_unit_price_optional_without_ice_cream():
    assert _compute_unit_price(_emi(IceCreamMode.optional, "10.00", "5.00"), False) == Decimal("10.00")

def test_compute_unit_price_optional_no_addon_price():
    assert _compute_unit_price(_emi(IceCreamMode.optional, "10.00", None), True) == Decimal("10.00")


# ── _is_slot_in_past ─────────────────────────────────────────────────────────

def _dt(year, month, day, hour=0, minute=0):
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)

def test_slot_in_past():
    assert _is_slot_in_past(_dt(2020, 1, 1, 10), _dt(2020, 1, 1, 11)) is True

def test_slot_not_in_past():
    assert _is_slot_in_past(_dt(2020, 1, 1, 11), _dt(2020, 1, 1, 10)) is False

def test_slot_at_exact_now_not_past():
    now = _dt(2020, 1, 1, 10)
    assert _is_slot_in_past(now, now) is False


# ── _generate_slot_objects ────────────────────────────────────────────────────

def test_generate_slot_objects_basic():
    eid = uuid.uuid4()
    slots = _generate_slot_objects(
        date(2026, 6, 1), time(18, 0), time(20, 0), 30, eid
    )
    assert len(slots) == 4
    assert all(s.event_id == eid for s in slots)

def test_generate_slot_objects_indivisible_raises():
    with pytest.raises(ValueError):
        _generate_slot_objects(date(2026, 6, 1), time(18, 0), time(19, 0), 40, uuid.uuid4())

def test_generate_slot_objects_contiguous():
    slots = _generate_slot_objects(date(2026, 6, 1), time(18, 0), time(19, 0), 30, uuid.uuid4())
    assert slots[0].slot_end == slots[1].slot_start


# ── _compute_new_ice_cream_qty ────────────────────────────────────────────────

def _item_in(emi_id, qty, with_ice_cream=None):
    return OrderItemIn(event_menu_item_id=emi_id, quantity=qty, with_ice_cream=with_ice_cream)

def test_compute_ice_cream_qty_all_none():
    eid = uuid.uuid4()
    menu_map = {eid: _emi(IceCreamMode.none, "10")}
    assert _compute_new_ice_cream_qty([_item_in(eid, 3)], menu_map) == 0

def test_compute_ice_cream_qty_included():
    eid = uuid.uuid4()
    menu_map = {eid: _emi(IceCreamMode.included, "10")}
    assert _compute_new_ice_cream_qty([_item_in(eid, 2)], menu_map) == 2

def test_compute_ice_cream_qty_optional_with():
    eid = uuid.uuid4()
    menu_map = {eid: _emi(IceCreamMode.optional, "10", "5")}
    assert _compute_new_ice_cream_qty([_item_in(eid, 3, True)], menu_map) == 3

def test_compute_ice_cream_qty_optional_without():
    eid = uuid.uuid4()
    menu_map = {eid: _emi(IceCreamMode.optional, "10", "5")}
    assert _compute_new_ice_cream_qty([_item_in(eid, 3, False)], menu_map) == 0
