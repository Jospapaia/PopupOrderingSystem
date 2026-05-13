import { useEffect, useState } from "react";
import { adminListSlots, adminUpdateSlot, adminPickupOrder, adminCancelOrder, toApiError } from "../../api/client";
import type { SlotAdminOut, OrderSummary } from "../../api/types";
import { formatTime } from "../../utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../utils/eventStatus";

interface Props {
  eventId: string;
}

export default function SlotGrid({ eventId }: Props) {
  const [slots, setSlots] = useState<SlotAdminOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [newMax, setNewMax] = useState("");
  const [slotEditError, setSlotEditError] = useState<Record<string, string>>({});

  const load = () =>
    adminListSlots(eventId).then(setSlots).catch((e: unknown) => setError(toApiError(e).message));

  useEffect(() => { load(); }, [eventId]);

  const handleUpdateSlot = async (slotId: string) => {
    setSlotEditError({});
    const slot = slots.find((s) => s.id === slotId);
    const parsed = parseInt(newMax);
    const minAllowed = Math.max(1, slot?.booked_portions ?? 1);
    if (isNaN(parsed) || parsed < minAllowed) {
      setSlotEditError({ [slotId]: slot && slot.booked_portions > 0 ? `לא ניתן להפחית מתחת ל-${slot.booked_portions} מנות מוזמנות` : "יש להזין מספר חיובי" });
      return;
    }
    try {
      await adminUpdateSlot(slotId, { max_ice_cream: parsed });
      setEditingSlotId(null);
      load();
    } catch (err: unknown) {
      const e = toApiError(err);
      const booked = typeof e.current_booked === "number" ? e.current_booked : "?";
      setSlotEditError({ [slotId]: `לא ניתן להפחית — כבר הוזמנו ${booked} מנות` });
    }
  };

  const handlePickup = async (orderId: string) => {
    if (!window.confirm("לאשר איסוף? פעולה זו אינה ניתנת לביטול.")) return;
    try {
      await adminPickupOrder(orderId);
      load();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("לבטל הזמנה זו?")) return;
    try {
      await adminCancelOrder(orderId);
      load();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}

      {slots.length === 0 && (
        <p className="text-gray-500 text-sm">אין סלוטים — פרסם את האירוע כדי לייצר סלוטים.</p>
      )}

      <div className="space-y-4">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`bg-white border-2 rounded-xl p-4 ${slot.is_full ? "border-red-300" : "border-gray-200"}`}
          >
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="font-semibold">{formatTime(slot.slot_start)}</span>
                <span className="text-gray-400 mx-1">–</span>
                <span className="text-gray-500 text-sm">{formatTime(slot.slot_end)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${slot.is_full ? "text-red-600" : "text-gray-700"}`}>
                  {slot.booked_portions} מנות גלידה מתוך {slot.max_ice_cream_effective}
                </span>
                {slot.is_full && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">מלא</span>
                )}
              </div>
            </div>

            {editingSlotId === slot.id ? (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <input
                  type="number"
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  className="w-20 border rounded px-2 py-1"
                  min={slot.booked_portions}
                  placeholder="מקסימום"
                />
                <button onClick={() => handleUpdateSlot(slot.id)} className="bg-pink-500 text-white px-3 py-1 rounded">שמור</button>
                <button onClick={() => setEditingSlotId(null)} className="border px-3 py-1 rounded">ביטול</button>
                {slotEditError[slot.id] && <span className="text-red-600 text-xs">{slotEditError[slot.id]}</span>}
              </div>
            ) : (
              <button
                onClick={() => { setEditingSlotId(slot.id); setNewMax(slot.max_ice_cream !== null ? String(slot.max_ice_cream) : ""); }}
                className="text-xs text-blue-600 hover:underline mb-3"
              >
                עדכן קיבולת
              </button>
            )}

            {slot.orders.length > 0 && (
              <div className="border-t pt-2 space-y-2">
                {slot.orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onPickup={() => handlePickup(order.id)}
                    onCancel={() => handleCancelOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  onPickup,
  onCancel,
}: {
  order: OrderSummary;
  onPickup: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="text-sm flex justify-between items-start py-1">
      <div>
        <span className="font-medium">{order.customer_name}</span>
        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
        <div className="text-xs text-gray-400 mt-0.5">
          {order.items.map((oi) =>
            `${oi.product_name}×${oi.quantity}${oi.with_ice_cream ? "+גלידה" : ""}`
          ).join(", ")}
        </div>
        {order.notes && <div className="text-xs text-orange-600 mt-0.5">הערה: {order.notes}</div>}
      </div>
      {order.status === "confirmed" && (
        <div className="flex gap-1">
          <button onClick={onPickup} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">אשר איסוף</button>
          <button onClick={onCancel} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">בטל</button>
        </div>
      )}
    </div>
  );
}
