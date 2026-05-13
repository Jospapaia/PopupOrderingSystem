import { useState } from "react";
import type { UpcomingEvent, OrderOut, CartItem } from "../../api/types";
import ItemList from "./ItemList";
import SlotPicker from "./SlotPicker";
import OrderForm from "./OrderForm";
import Confirmation from "./Confirmation";
import { createOrder, getUpcomingEvent, BASE, toApiError } from "../../api/client";
import { formatDate, formatTimeRange } from "../../utils/format";
import { needsSlotForCart } from "../../utils/cart";

type Step = "items" | "slot" | "name" | "done";

interface Props {
  event: UpcomingEvent;
}

export default function EventPage({ event }: Props) {
  const [step, setStep] = useState<Step>("items");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderOut | null>(null);
  const [fullSlots, setFullSlots] = useState<Set<string>>(new Set());
  const [eventSlots, setEventSlots] = useState(event.slots);

  const needsSlot = needsSlotForCart(cart);

  const refreshSlots = () => {
    getUpcomingEvent().then((res) => {
      if (res.event?.id === event.id) setEventSlots(res.event.slots);
    }).catch(() => {});
  };

  const handleItemsDone = () => {
    if (cart.every((ci) => ci.quantity === 0)) return;
    setError(null);
    if (needsSlot) {
      refreshSlots();
      setStep("slot");
    } else {
      setStep("name");
    }
  };

  const handleSlotSelected = (slotId: string) => {
    setSelectedSlotId(slotId);
    setStep("name");
  };

  const handleSubmit = async (customerName: string, notes: string) => {
    setError(null);
    const items = cart
      .filter((ci) => ci.quantity > 0)
      .map((ci) => ({
        event_menu_item_id: ci.menuItem.id,
        quantity: ci.quantity,
        with_ice_cream:
          ci.menuItem.ice_cream_mode === "optional" ? ci.withIceCream : null,
      }));

    try {
      const result = await createOrder({
        event_id: event.id,
        slot_id: needsSlot ? selectedSlotId : null,
        customer_name: customerName,
        notes: notes || null,
        items,
      });
      setOrder(result);
      setStep("done");
    } catch (err: unknown) {
      const e = toApiError(err);
      if (e.status === 409 && e.message.includes("עבר")) {
        setError("הסלוט שנבחר כבר עבר — אנא בחר סלוט אחר");
        setSelectedSlotId(null);
        setStep("slot");
      } else if (e.status === 409 && e.message.includes("סלוט")) {
        setError("הסלוט התמלא — אנא בחר סלוט אחר");
        if (selectedSlotId) {
          setFullSlots((prev) => new Set([...prev, selectedSlotId]));
        }
        setSelectedSlotId(null);
        refreshSlots();
        setStep("slot");
      } else if (e.status === 409) {
        setError(e.message || "הפריט אזל מהמלאי");
        setStep("items");
      } else if (e.message === "NETWORK_ERROR") {
        setError("המערכת לא זמינה כרגע, אנא נסה שוב בעוד מספר רגעים");
      } else {
        setError(e.message || "אירעה שגיאה, אנא נסה שוב");
      }
    }
  };

  if (step === "done" && order) {
    return <Confirmation order={order} cart={cart} slotStart={
      selectedSlotId
        ? eventSlots.find((s) => s.id === selectedSlotId)?.slot_start ?? null
        : null
    } />;
  }

  return (
    <div className="min-h-screen bg-warm-50" dir="rtl">
      {/* Logo / brand header */}
      <header className="bg-warm-600 text-white text-center py-5 px-4 shadow-md">
        {/* Logo placeholder — swap with <img> when ready */}
        <div className="inline-flex items-center gap-2 mb-1">
          <span className="text-3xl">🍦</span>
          <span className="text-2xl font-extrabold tracking-wide">הפופ-אפ</span>
        </div>
        <p className="text-warm-100 text-sm font-medium">{event.title}</p>
        <p className="text-warm-200 text-xs mt-0.5">
          {formatDate(event.date)} · {formatTimeRange(event.start_time, event.end_time)}
        </p>
      </header>

      {/* Step progress dots */}
      {step !== "done" && (
        <div className="flex justify-center gap-2 py-3">
          {(["items", "slot", "name"] as const)
            .filter((s) => s !== "slot" || needsSlot)
            .map((s, i, arr) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-6 bg-warm-500"
                    : arr.indexOf(step) > i
                    ? "w-2 bg-warm-400"
                    : "w-2 bg-warm-200"
                }`}
              />
            ))}
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 text-sm text-center">
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
            onSelect={handleSlotSelected}
            onBack={() => setStep("items")}
          />
        )}
        {step === "name" && (
          <OrderForm
            cart={cart}
            slotStart={
              selectedSlotId
                ? eventSlots.find((s) => s.id === selectedSlotId)?.slot_start ?? null
                : null
            }
            onSubmit={handleSubmit}
            onBack={() => { if (needsSlot) { refreshSlots(); setStep("slot"); } else { setStep("items"); } }}
          />
        )}
      </main>
    </div>
  );
}
