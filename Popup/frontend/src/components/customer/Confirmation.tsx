import type { OrderOut, CartItem } from "../../api/types";
import { formatTime } from "../../utils/format";

interface Props {
  order: OrderOut;
  cart: CartItem[];
  slotStart: string | null;
}

export default function Confirmation({ order, cart, slotStart }: Props) {
  const total = order.items.reduce(
    (sum, oi) => sum + oi.unit_price * oi.quantity,
    0,
  );
  const shortId = order.id.slice(0, 8).toUpperCase();
  const cartMap = new Map(cart.map((ci) => [ci.menuItem.id, ci]));

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="max-w-sm w-full">
        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-extrabold text-stone-800">ההזמנה אושרה!</h1>
          <p className="text-stone-500 mt-1 text-sm">מספר הזמנה #{shortId}</p>
        </div>

        {/* Receipt card */}
        <div className="bg-white rounded-3xl shadow-card p-5 mb-5">
          <div className="space-y-2 mb-4">
            {order.items.map((oi) => {
              const ci = cartMap.get(oi.event_menu_item_id);
              return (
                <div key={oi.id} className="flex justify-between items-center text-stone-700 text-sm">
                  <span>
                    {ci?.menuItem.product_name ?? oi.product_name ?? "פריט"}
                    {oi.quantity > 1 && <span className="text-stone-400"> ×{oi.quantity}</span>}
                    {oi.with_ice_cream && <span className="text-warm-500"> + גלידה</span>}
                  </span>
                  <span className="font-semibold">₪{(oi.unit_price * oi.quantity).toFixed(0)}</span>
                </div>
              );
            })}
          </div>

          {slotStart && (
            <div className="flex items-center gap-2 text-stone-600 text-sm py-3 border-t border-stone-100">
              <span>🕐</span>
              <span>איסוף בשעה <strong>{formatTime(slotStart)}</strong></span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-stone-100">
            <span className="font-bold text-stone-800">סה"כ לתשלום</span>
            <span className="font-extrabold text-warm-600 text-xl">₪{total.toFixed(0)}</span>
          </div>
        </div>

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-amber-800 font-medium">📸 שמור צילום מסך</p>
          <p className="text-xs text-amber-700 mt-1">זוהי הרשומה היחידה של הזמנתך</p>
        </div>
      </div>
    </div>
  );
}
