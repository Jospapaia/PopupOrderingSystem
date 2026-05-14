import { useState } from "react";
import type { UpcomingEvent, OrderOut, CartItem } from "../../api/types";
import ItemList from "./ItemList";
import SlotPicker from "./SlotPicker";
import OrderForm from "./OrderForm";
import Confirmation from "./Confirmation";
import { createOrder, getUpcomingEvent, BASE, toApiError } from "../../api/client";
import { formatDate, formatTimeRange } from "../../utils/format";
import { needsSlotForCart, cartIceCreamPortions, cartItemQuantity } from "../../utils/cart";

type Step = "items" | "slot" | "name" | "done";

interface Props { event: UpcomingEvent; }


export default function EventPage({ event }: Props) {
  const [step, setStep]                 = useState<Step>("items");
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const descIsLong = (event.description?.length ?? 0) > 100;
  const [order, setOrder]               = useState<OrderOut | null>(null);
  const [fullSlots, setFullSlots]       = useState<Set<string>>(new Set());
  const [eventSlots, setEventSlots]     = useState(event.slots);

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
          {/* Logo placeholder */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-full border border-gold/50 bg-gold/10 flex items-center justify-center shadow-lg">
            <span className="text-2xl leading-none">🍦</span>
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
            <div className="relative bg-white/80 border border-caramel-200/70 rounded-2xl px-5 py-4 text-center shadow-sm overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              <p className={`text-sm text-caramel-700 leading-relaxed ${!descExpanded && descIsLong ? "line-clamp-3" : ""}`}>
                {event.description}
              </p>
              {!descExpanded && descIsLong && (
                <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
              )}
            </div>

            {/* toggle */}
            {descIsLong && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="w-full text-center text-xs text-caramel-400 mt-2 py-0.5 hover:text-chocolate transition-colors"
              >
                {descExpanded ? "סגירה ↑" : "קריאה נוספת ↓"}
              </button>
            )}

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
          <ItemList
            menuItems={event.menu_items}
            cart={cart}
            onChange={setCart}
            onNext={handleItemsDone}
            baseUrl={BASE}
          />
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
