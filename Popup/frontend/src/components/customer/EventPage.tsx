import { useState, useEffect } from "react";
import type { UpcomingEvent, OrderOut, CartItem, AboutPageOut } from "../../api/types";
import ItemList from "./ItemList";
import SlotPicker from "./SlotPicker";
import OrderForm from "./OrderForm";
import Confirmation from "./Confirmation";
import { createOrder, getUpcomingEvent, getAbout, BASE, toApiError } from "../../api/client";
import { formatDate, formatTimeRange } from "../../utils/format";
import { needsSlotForCart, cartIceCreamPortions, cartItemQuantity } from "../../utils/cart";

type Step = "items" | "slot" | "name" | "done";

interface Props { event: UpcomingEvent; }


export default function EventPage({ event }: Props) {
  const [step, setStep]                 = useState<Step>("items");
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [order, setOrder]               = useState<OrderOut | null>(null);
  const [fullSlots, setFullSlots]       = useState<Set<string>>(new Set());
  const [eventSlots, setEventSlots]     = useState(event.slots);
  const [about, setAbout]               = useState<AboutPageOut | null>(null);

  useEffect(() => {
    getAbout().then(setAbout).catch(() => {});
  }, []);

  const needsSlot = needsSlotForCart(cart);

  const refreshSlots = () =>
    getUpcomingEvent().then((res) => {
      if (res.event?.id === event.id) setEventSlots(res.event.slots);
    }).catch(() => {});

  const handleItemsDone = () => {
    if (cart.every((ci) => cartItemQuantity(ci) === 0)) return;
    setError(null);
    if (needsSlot) { refreshSlots(); setStep("slot"); }
    else setStep("name");
  };

  const handleSlotSelected = (slotId: string) => {
    setSelectedSlotId(slotId);
    setStep("name");
  };

  const handleSubmit = async (customerName: string) => {
    setError(null);
    const items = cart
      .filter((ci) => cartItemQuantity(ci) > 0)
      .flatMap((ci) => {
        const rows = [];
        if (ci.quantityWithoutIceCream > 0) {
          rows.push({
            event_menu_item_id: ci.menuItem.id,
            quantity: ci.quantityWithoutIceCream,
            with_ice_cream: ci.menuItem.ice_cream_mode === "optional" ? false : null,
          });
        }
        if (ci.quantityWithIceCream > 0) {
          rows.push({
            event_menu_item_id: ci.menuItem.id,
            quantity: ci.quantityWithIceCream,
            with_ice_cream: ci.menuItem.ice_cream_mode === "optional" ? true : null,
          });
        }
        return rows;
      });

    try {
      const result = await createOrder({
        event_id: event.id,
        slot_id: needsSlot ? selectedSlotId : null,
        customer_name: customerName,
        notes: null,
        items,
      });
      setOrder(result);
      setStep("done");
    } catch (err: unknown) {
      const e = toApiError(err);
      if (e.status === 409 && e.message.includes("עבר")) {
        setError("הסלוט שנבחר כבר עבר — נא לבחור שעה אחרת");
        setSelectedSlotId(null); setStep("slot");
      } else if (e.status === 409 && e.message.includes("סלוט")) {
        setError("הסלוט התמלא — נא לבחור שעה אחרת");
        if (selectedSlotId) setFullSlots((p) => new Set([...p, selectedSlotId]));
        setSelectedSlotId(null); refreshSlots(); setStep("slot");
      } else if (e.status === 409) {
        setError(e.message || "הפריט אזל מהמלאי"); setStep("items");
      } else if (e.message === "NETWORK_ERROR") {
        setError("המערכת לא זמינה כרגע, אנא נסה שוב בעוד מספר רגעים");
      } else {
        setError(e.message || "אירעה שגיאה, אנא נסה שוב");
      }
    }
  };

  const resetToStart = () => {
    setStep("items");
    setCart([]);
    setSelectedSlotId(null);
    setOrder(null);
    setError(null);
    setFullSlots(new Set());
    refreshSlots();
  };

  if (step === "done" && order) {
    return (
      <Confirmation
        order={order}
        cart={cart}
        slotStart={selectedSlotId ? eventSlots.find((s) => s.id === selectedSlotId)?.slot_start ?? null : null}
        onBack={resetToStart}
      />
    );
  }


  return (
    <div className="min-h-screen" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="relative bg-chocolate text-cream overflow-hidden">
        {/* warm glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-caramel-700/30 blur-3xl" />
          <div className="absolute -bottom-4 left-8 w-32 h-32 rounded-full bg-gold/20 blur-2xl" />
        </div>

        <div className="relative z-10 text-center px-6 pt-8 pb-7">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden bg-white shadow-lg">
            <img src="/logo.png" alt="לוגו" className="w-full h-full object-contain p-1" />
          </div>

          {/* Event title – big Frank Ruhl Libre */}
          <h1 className="font-display font-bold text-[2rem] leading-snug text-cream mb-1">
            {event.title}
          </h1>

          {/* Ornamental divider */}
          <div className="flex items-center justify-center gap-2 my-2 opacity-50">
            <div className="h-px w-10 bg-gold" />
            <span className="text-gold text-xs">✦</span>
            <div className="h-px w-10 bg-gold" />
          </div>

          <p className="text-caramel-300 text-sm tracking-wide">
            {formatDate(event.date)} · {formatTimeRange(event.start_time, event.end_time)}
          </p>

          {about?.bio_text && (
            <a
              href="/about"
              className="inline-block mt-3 text-xs text-caramel-400 hover:text-cream transition-colors border border-caramel-600/40 hover:border-caramel-400 rounded-full px-3 py-1"
            >
              קצת עלי ›
            </a>
          )}
        </div>
      </header>

      {/* ── Description card ───────────────────────────────────────── */}
      {step !== "done" && event.description && (
        <div className="px-4 py-4 bg-parchment/50">
          <div className="max-w-sm mx-auto">

            {/* ornamental rule */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-caramel-300/50" />
              <span className="text-gold text-[10px] tracking-widest opacity-70">✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-caramel-300/50" />
            </div>

            {/* box */}
            <div className="relative bg-white/80 border border-caramel-200/70 rounded-2xl px-5 py-4 text-center shadow-sm">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              <p className="text-sm text-caramel-700 leading-relaxed">
                {event.description?.split(/\n|<br\s*\/?>/i).map((part, i, arr) => (
                  <span key={i}>{part}{i < arr.length - 1 && <br />}</span>
                ))}
              </p>
            </div>

            {/* ornamental rule */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-caramel-300/50" />
              <span className="text-gold text-[10px] tracking-widest opacity-70">✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-caramel-300/50" />
            </div>

          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pb-8 pt-2">
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {step === "items" && (
          <>
            {/* Event-wide ice cream cap banner */}
            {event.ice_cream_total_remaining === 0 ? (
              <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl px-4 py-3 text-sm text-center font-semibold">
                מנות הגלידה אזלו
              </div>
            ) : event.ice_cream_total_remaining !== null && event.ice_cream_total_remaining <= 5 ? (
              <div className="mt-3 bg-caramel-50 border border-caramel-200 text-caramel-700 rounded-2xl px-4 py-3 text-sm text-center font-medium">
                נשארו {event.ice_cream_total_remaining} מנות גלידה לאירוע
              </div>
            ) : null}
            <ItemList
              menuItems={event.menu_items}
              cart={cart}
              onChange={setCart}
              onNext={handleItemsDone}
              baseUrl={BASE}
              iceCreamTotalRemaining={event.ice_cream_total_remaining}
            />
            <div className="mt-6 text-center">
              <a
                href="https://wa.me/972509230882"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-caramel-400 hover:text-chocolate transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                שאלות? כתבו לנו בוואטסאפ
              </a>
            </div>
          </>
        )}
        {step === "slot" && (
          <SlotPicker
            slots={eventSlots}
            extraFullSlots={fullSlots}
            selectedSlotId={selectedSlotId}
            iceCreamPortions={cartIceCreamPortions(cart)}
            onSelect={handleSlotSelected}
            onBack={() => setStep("items")}
          />
        )}
        {step === "name" && (
          <OrderForm
            cart={cart}
            slotStart={selectedSlotId ? eventSlots.find((s) => s.id === selectedSlotId)?.slot_start ?? null : null}
            onSubmit={handleSubmit}
            onBack={() => { if (needsSlot) { refreshSlots(); setStep("slot"); } else setStep("items"); }}
          />
        )}
      </main>
    </div>
  );
}
