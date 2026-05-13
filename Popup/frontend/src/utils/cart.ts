import type { CartItem } from "../api/types";

export function itemLineTotal(ci: CartItem): number {
  let price = ci.menuItem.price;
  if (
    ci.menuItem.ice_cream_mode === "optional" &&
    ci.withIceCream &&
    ci.menuItem.ice_cream_addon_price
  ) {
    price += ci.menuItem.ice_cream_addon_price;
  }
  return price * ci.quantity;
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, ci) => sum + itemLineTotal(ci), 0);
}

export function needsSlotForCart(cart: CartItem[]): boolean {
  return cart.some(
    (ci) =>
      ci.quantity > 0 &&
      (ci.menuItem.ice_cream_mode === "included" ||
        (ci.menuItem.ice_cream_mode === "optional" && ci.withIceCream)),
  );
}
