import type { CartItem } from "../api/types";

export function cartItemQuantity(ci: CartItem): number {
  return ci.quantityWithIceCream + ci.quantityWithoutIceCream;
}

export function itemLineTotal(ci: CartItem): number {
  const base = ci.menuItem.price;
  const addon = ci.menuItem.ice_cream_addon_price ?? 0;
  return base * cartItemQuantity(ci) + addon * ci.quantityWithIceCream;
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, ci) => sum + itemLineTotal(ci), 0);
}

export function cartIceCreamPortions(cart: CartItem[]): number {
  return cart.reduce((sum, ci) => sum + ci.quantityWithIceCream, 0);
}

export function needsSlotForCart(cart: CartItem[]): boolean {
  return cart.some((ci) => ci.quantityWithIceCream > 0);
}
