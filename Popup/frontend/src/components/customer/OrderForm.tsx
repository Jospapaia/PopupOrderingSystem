import { useState, type FormEvent } from "react";
import type { CartItem } from "../../api/types";
import { formatTime } from "../../utils/format";
import { cartTotal, itemLineTotal } from "../../utils/cart";

interface Props {
  cart: CartItem[];
  slotStart: string | null;
  onSubmit: (name: string, notes: string) => Promise<void>;
  onBack: () => void;
}

export default function OrderForm({ cart, slotStart, onSubmit, onBack }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const total = cartTotal(cart);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim(), notes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-warm-600 text-sm font-medium mb-5 hover:text-warm-700"
      >
        <span className="text-lg">›</span>
        <span>חזור</span>
      </button>

      <h2 className="text-xl font-bold text-stone-800 mb-5">סיכום הזמנה</h2>

      {/* Order summary card */}
      <div className="bg-white rounded-3xl shadow-card p-4 mb-6">
        <div className="space-y-2">
          {cart.filter((ci) => ci.quantity > 0).map((ci) => (
            <div key={ci.menuItem.id} className="flex justify-between items-center text-stone-700">
              <span className="text-sm">
                {ci.menuItem.product_name}
                {ci.quantity > 1 && <span className="text-stone-400"> ×{ci.quantity}</span>}
                {ci.menuItem.ice_cream_mode === "optional" && ci.withIceCream && (
                  <span className="text-warm-500"> + גלידה</span>
                )}
              </span>
              <span className="font-semibold text-sm">₪{itemLineTotal(ci).toFixed(0)}</span>
            </div>
          ))}
        </div>

        {slotStart && (
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 text-stone-600 text-sm">
            <span>🕐</span>
            <span>איסוף בשעה {formatTime(slotStart)}</span>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between items-center">
          <span className="font-bold text-stone-800">סה"כ לתשלום</span>
          <span className="font-extrabold text-warm-600 text-xl">₪{total.toFixed(0)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">שמך *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            autoFocus
            className="w-full bg-white border-2 border-stone-200 focus:border-warm-400 rounded-2xl px-4 py-3 text-base outline-none transition-colors"
            placeholder="הכנס שמך"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">
            בקשות מיוחדות
            <span className="text-stone-400 font-normal"> (אופציונלי)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full bg-white border-2 border-stone-200 focus:border-warm-400 rounded-2xl px-4 py-3 text-base outline-none transition-colors resize-none"
            placeholder="אלרגיות, בקשות מיוחדות..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-warm-600 hover:bg-warm-700 disabled:bg-warm-200 text-white py-4 rounded-3xl font-bold text-lg shadow-md transition-colors"
        >
          {loading ? "שולח הזמנה..." : "אשר הזמנה ✓"}
        </button>
      </form>
    </div>
  );
}
