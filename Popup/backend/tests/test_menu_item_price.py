"""Price edits on menu items — allowed on published events, validated, no DB required."""
from __future__ import annotations
import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

from app.models.models import IceCreamMode
from app.routers.admin import update_menu_item
from app.routers.public import _compute_unit_price
from app.schemas import EventMenuItemUpdate


def _menu_item(price: str = "20.00", addon: str | None = "5.00") -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        event_id=uuid.uuid4(),
        product_id=uuid.uuid4(),
        product=SimpleNamespace(name="אפוגטו", ice_cream_mode=IceCreamMode.optional),
        quantity_available=10,
        price=Decimal(price),
        ice_cream_addon_price=Decimal(addon) if addon is not None else None,
        is_active=True,
        sort_order=0,
    )


def _db_returning(item) -> MagicMock:
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = item
    return db


def test_update_price_and_addon_applies():
    item = _menu_item()
    db = _db_returning(item)
    out = update_menu_item(item.id, EventMenuItemUpdate(price=Decimal("25"), ice_cream_addon_price=Decimal("7")), db)
    assert out.price == Decimal("25")
    assert out.ice_cream_addon_price == Decimal("7")
    db.commit.assert_called_once()


def test_update_price_only_leaves_other_fields():
    item = _menu_item()
    out = update_menu_item(item.id, EventMenuItemUpdate(price=Decimal("30")), _db_returning(item))
    assert out.price == Decimal("30")
    assert out.ice_cream_addon_price == Decimal("5.00")
    assert out.quantity_available == 10


def test_new_price_affects_only_newly_computed_unit_price():
    item = _menu_item()
    old_snapshot = _compute_unit_price(item, True)  # what an existing order stored
    update_menu_item(item.id, EventMenuItemUpdate(price=Decimal("30")), _db_returning(item))
    assert old_snapshot == Decimal("25.00")
    assert _compute_unit_price(item, True) == Decimal("35.00")


@pytest.mark.parametrize("field", ["price", "ice_cream_addon_price"])
def test_negative_prices_rejected(field):
    with pytest.raises(ValidationError):
        EventMenuItemUpdate(**{field: Decimal("-1")})


def test_zero_price_allowed():
    assert EventMenuItemUpdate(price=Decimal("0")).price == Decimal("0")
