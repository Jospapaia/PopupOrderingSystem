import { useState, type FormEvent } from "react";
import type { CartItem } from "../../api/types";
import { formatTime } from "../../utils/format";
import { cartTotal, cartItemQuantity } from "../../utils/cart";

interface Props {
  cart: CartItem[];
  slotStart: string | null;
  onSubmit: (name: string) => Promise<void>;
  onBack: () => void;
}

export default function OrderForm({ cart, slotStart, onSubmit, onBack }: Props) {
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);

  const total = cartTotal(cart);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try { await onSubmit(name.trim()); }
    finally { setLoading(false); }
  };

  return (
    <div className="pt-3 animate-fade-in">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-caramel-600 text-sm font-medium mb-5 hover:text-caramel-700 transition-colors"
      >
        <span className="text-base leading-none">›</span>
        <span>חזרה</span>
      </button>

      <h2 className="font-display font-bold text-2xl text-chocolate mb-5">סיכום הזמנה</h2>

      {/* Receipt card */}
      <div className="bg-white rounded-3xl shadow-card overflow-hidden mb-5">
        {/* Items */}
        <div className="px-5 pt-5 pb-3 space-y-2.5">
          {cart.filter((ci) => cartItemQuantity(ci) > 0).flatMap((ci) => {
            const rows = [];
            if (ci.quantityWithoutIceCream > 0) {
              rows.push(
                <div key={`${ci.menuItem.id}-plain`} className="flex justify-between items-center">
                  <span className="text-chocolate text-sm leading-snug">
                    <span className="font-semibold">{ci.menuItem.product_name}</span>
                    {ci.quantityWithoutIceCream > 1 && <span className="text-caramel-400 font-normal"> ×{ci.quantityWithoutIceCream}</span>}
                  </span>
                  <span className="font-bold text-chocolate text-sm mr-3 shrink-0">
                    ₪{(ci.menuItem.price * ci.quantityWithoutIceCream).toFixed(0)}
                  </span>
                </div>
              );
            }
            if (ci.quantityWithIceCream > 0) {
              const priceEach = ci.menuItem.price + (ci.menuItem.ice_cream_addon_price ?? 0);
              rows.push(
                <div key={`${ci.menuItem.id}-ice`} className="flex justify-between items-center">
                  <span className="text-chocolate text-sm leading-snug">
                    <span className="font-semibold">{ci.menuItem.product_name}</span>
                    {ci.menuItem.ice_cream_mode === "optional" && <span className="text-caramel-500"> + גלידה 🍦</span>}
                    {ci.quantityWithIceCream > 1 && <span className="text-caramel-400 font-normal"> ×{ci.quantityWithIceCream}</span>}
                  </span>
                  <span className="font-bold text-chocolate text-sm mr-3 shrink-0">
                    ₪{(priceEach * ci.quantityWithIceCream).toFixed(0)}
                  </span>
                </div>
              );
            }
            return rows;
          })}
        </div>

        {/* Dashed separator */}
        <div className="mx-5 border-t border-dashed border-caramel-200 my-1" />

        {/* Slot + total */}
        <div className="px-5 py-3 space-y-2">
          {slotStart && (
            <div className="flex items-center gap-2 text-caramel-600 text-sm">
              <span>🕐</span>
              <span>איסוף בשעה <strong className="font-bold text-chocolate">{formatTime(slotStart)}</strong></span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-chocolate">סה״כ לתשלום</span>
            <span className="font-display font-bold text-2xl text-caramel-500">₪{total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-chocolate mb-1.5">
            שם <span className="text-caramel-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            autoFocus
            placeholder="שם"
            className="
              w-full bg-white border-2 border-caramel-200 focus:border-caramel-500
              rounded-2xl px-4 py-3 text-base text-chocolate outline-none
              transition-colors placeholder:text-caramel-300
            "
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="
            relative w-full overflow-hidden bg-chocolate text-cream py-4 rounded-3xl
            font-bold text-lg shadow-button-lg transition-all duration-150
            active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
            hover:bg-chocolate-light
          "
        >
          <span className="relative z-10 font-display">
            {loading ? "שליחת הזמנה..." : "אישור הזמנה ✓"}
          </span>
          {!loading && (
            <span className="absolute inset-0 bg-gradient-to-l from-transparent via-white/8 to-transparent animate-shimmer" />
          )}
        </button>
      </form>
    </div>
  );
}
