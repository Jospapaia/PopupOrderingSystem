import { describe, it, expect } from "vitest";
import { itemLineTotal, cartTotal, needsSlotForCart } from "./cart";
import type { CartItem } from "../api/types";

function makeItem(
  mode: "none" | "included" | "optional",
  price: number,
  addon: number | null = null,
): CartItem["menuItem"] {
  return {
    id: "1",
    product_name: "Test",
    ice_cream_mode: mode,
    price,
    ice_cream_addon_price: addon,
    remaining_quantity: 10,
    image_url: null,
  };
}

describe("itemLineTotal", () => {
  it("none mode — no addon", () => {
    const ci: CartItem = { menuItem: makeItem("none", 10), quantity: 2, withIceCream: false };
    expect(itemLineTotal(ci)).toBe(20);
  });

  it("optional with ice cream — adds addon", () => {
    const ci: CartItem = { menuItem: makeItem("optional", 10, 5), quantity: 2, withIceCream: true };
    expect(itemLineTotal(ci)).toBe(30);
  });

  it("optional without ice cream — no addon", () => {
    const ci: CartItem = { menuItem: makeItem("optional", 10, 5), quantity: 2, withIceCream: false };
    expect(itemLineTotal(ci)).toBe(20);
  });

  it("optional null addon — no crash", () => {
    const ci: CartItem = { menuItem: makeItem("optional", 10, null), quantity: 1, withIceCream: true };
    expect(itemLineTotal(ci)).toBe(10);
  });
});

describe("cartTotal", () => {
  it("sums all items", () => {
    const cart: CartItem[] = [
      { menuItem: makeItem("none", 10), quantity: 2, withIceCream: false },
      { menuItem: makeItem("included", 15), quantity: 1, withIceCream: false },
    ];
    expect(cartTotal(cart)).toBe(35);
  });

  it("empty cart is 0", () => {
    expect(cartTotal([])).toBe(0);
  });
});

describe("needsSlotForCart", () => {
  it("false for none-only cart", () => {
    const cart: CartItem[] = [
      { menuItem: makeItem("none", 10), quantity: 1, withIceCream: false },
    ];
    expect(needsSlotForCart(cart)).toBe(false);
  });

  it("true for included item with quantity > 0", () => {
    const cart: CartItem[] = [
      { menuItem: makeItem("included", 15), quantity: 1, withIceCream: false },
    ];
    expect(needsSlotForCart(cart)).toBe(true);
  });

  it("true for optional with ice cream", () => {
    const cart: CartItem[] = [
      { menuItem: makeItem("optional", 10, 5), quantity: 1, withIceCream: true },
    ];
    expect(needsSlotForCart(cart)).toBe(true);
  });

  it("false for optional without ice cream", () => {
    const cart: CartItem[] = [
      { menuItem: makeItem("optional", 10, 5), quantity: 1, withIceCream: false },
    ];
    expect(needsSlotForCart(cart)).toBe(false);
  });

  it("false when quantity is 0", () => {
    const cart: CartItem[] = [
      { menuItem: makeItem("included", 15), quantity: 0, withIceCream: false },
    ];
    expect(needsSlotForCart(cart)).toBe(false);
  });
});
