import type { OrderOut, CartItem } from "../../api/types";
import { formatTime } from "../../utils/format";

interface Props {
  order: OrderOut;
  cart: CartItem[];
  slotStart: string | null;
  onBack: () => void;
}

export default function Confirmation({ order, cart, slotStart, onBack }: Props) {
  const total    = order.items.reduce((sum, oi) => sum + oi.unit_price * oi.quantity, 0);
  const shortId  = order.id.slice(0, 8).toUpperCase();
  const cartMap  = new Map(cart.map((ci) => [ci.menuItem.id, ci]));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" dir="rtl">
      <div className="w-full max-w-sm animate-scale-in">

        {/* Success badge */}
        <div className="text-center mb-7">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-chocolate flex items-center justify-center shadow-button-lg animate-bounce-in">
            <span className="text-gold text-3xl font-black">✓</span>
          </div>
          <h1 className="font-display font-black text-[2rem] text-chocolate leading-tight mb-1">
            ההזמנה אושרה!
          </h1>
          <p className="text-caramel-500 text-sm tracking-widest font-medium">
            #{shortId}
          </p>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden mb-4">
          {/* Header stripe */}
          <div className="bg-chocolate px-5 py-3">
            <p className="text-caramel-300 text-xs tracking-widest uppercase font-medium text-center">קבלה</p>
          </div>

          {/* Items */}
          <div className="px-5 pt-4 pb-2 space-y-2.5">
            {order.items.map((oi) => {
              const ci = cartMap.get(oi.event_menu_item_id);
              return (
                <div key={oi.id} className="flex justify-between items-center text-sm">
                  <span className="text-chocolate">
                    <span className="font-semibold">
                      {ci?.menuItem.product_name ?? oi.product_name ?? "פריט"}
                    </span>
                    {oi.quantity > 1 && <span className="text-caramel-400"> ×{oi.quantity}</span>}
                    {oi.with_ice_cream && <span className="text-caramel-500"> + גלידה</span>}
                  </span>
                  <span className="font-bold text-chocolate mr-3 shrink-0">
                    ₪{(oi.unit_price * oi.quantity).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mx-5 border-t border-dashed border-caramel-200 my-1" />

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

        {/* Save reminder */}
        <div className="bg-caramel-100 border border-caramel-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm font-bold text-chocolate">📸 שמור צילום מסך</p>
          <p className="text-xs text-caramel-600 mt-0.5">זוהי הרשומה היחידה של הזמנתך</p>
        </div>

        {/* Back to home */}
        <button
          onClick={onBack}
          className="w-full text-center text-sm font-medium text-caramel-500 hover:text-chocolate transition-colors py-2"
        >
          חזרה לתפריט
        </button>

      </div>
    </div>
  );
}
