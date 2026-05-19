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

        {/* WhatsApp */}
        <div className="text-center pb-2">
          <a
            href="https://wa.me/972509230882"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-caramel-400 hover:text-chocolate transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            יצירת קשר
          </a>
        </div>

      </div>
    </div>
  );
}
