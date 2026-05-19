import { useEffect, useState } from "react";
import { adminListSlots, adminUpdateSlot, adminPickupOrder, adminCancelOrder, toApiError } from "../../api/client";
import type { SlotAdminOut, OrderSummary } from "../../api/types";
import { formatTime } from "../../utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../utils/eventStatus";

interface Props {
  eventId: string;
  refreshKey?: number;
}

const inputCls =
  "bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300";

export default function SlotGrid({ eventId, refreshKey }: Props) {
  const [slots, setSlots] = useState<SlotAdminOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [newMax, setNewMax] = useState("");
  const [slotEditError, setSlotEditError] = useState<Record<string, string>>({});

  const load = () =>
    adminListSlots(eventId).then(setSlots).catch((e: unknown) => setError(toApiError(e).message));

  useEffect(() => { load(); }, [eventId, refreshKey]);

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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
      )}

      {slots.length === 0 && (
        <div className="text-center py-10 text-caramel-400">
          <p className="text-3xl mb-2">🕐</p>
          <p className="text-sm font-medium">אין סלוטים — פרסם את האירוע כדי לייצר סלוטים</p>
        </div>
      )}

      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.id}
            className={`bg-white rounded-2xl shadow-card p-4 border-2 ${
              slot.is_full ? "border-red-200" : "border-caramel-100"
            }`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-chocolate text-lg">{formatTime(slot.slot_start)}</span>
                <span className="text-caramel-400 text-sm">– {formatTime(slot.slot_end)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CapacityBar booked={slot.booked_portions} max={slot.max_ice_cream_effective} />
                {slot.is_full && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">מלא</span>
                )}
              </div>
            </div>

            {editingSlotId === slot.id ? (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <input
                  type="number"
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  className={`w-20 ${inputCls}`}
                  min={slot.booked_portions}
                  placeholder="מקס׳"
                />
                <button onClick={() => handleUpdateSlot(slot.id)}
                  className="bg-chocolate text-cream px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-chocolate-light transition-colors">
                  שמור
                </button>
                <button onClick={() => setEditingSlotId(null)}
                  className="bg-parchment border border-caramel-200 text-chocolate px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-caramel-100 transition-colors">
                  ביטול
                </button>
                {slotEditError[slot.id] && (
                  <span className="text-red-600 text-xs">{slotEditError[slot.id]}</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => { setEditingSlotId(slot.id); setNewMax(slot.max_ice_cream !== null ? String(slot.max_ice_cream) : ""); }}
                className="text-xs font-medium text-caramel-500 hover:text-chocolate transition-colors mb-3">
                עדכן קיבולת
              </button>
            )}

            {slot.orders.length > 0 && (
              <div className="border-t border-caramel-100 pt-3 space-y-2">
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

function CapacityBar({ booked, max }: { booked: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (booked / max) * 100) : 0;
  const barColor = pct >= 100 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-green-400";
  const textColor = pct >= 100 ? "text-red-600" : pct >= 75 ? "text-amber-600" : "text-caramel-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-caramel-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{booked}/{max}</span>
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
        <span className="font-semibold text-chocolate">{order.customer_name}</span>
        <span className={`text-xs mr-2 px-1.5 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
        <div className="text-xs text-caramel-400 mt-0.5">
          {order.items
            .filter((oi) => oi.used_ice_cream)
            .map((oi) => `${oi.product_name}×${oi.quantity}`)
            .join(", ")}
        </div>
        {order.notes && <div className="text-xs text-amber-600 mt-0.5">הערה: {order.notes}</div>}
      </div>
      {order.status === "confirmed" && (
        <div className="flex gap-1">
          <button onClick={onPickup}
            className="text-xs bg-caramel-500 text-white px-2 py-1 rounded-lg font-medium hover:bg-caramel-600 transition-colors">
            אשר איסוף
          </button>
          <button onClick={onCancel}
            className="text-xs bg-red-50 border border-red-100 text-red-600 px-2 py-1 rounded-lg font-medium hover:bg-red-100 transition-colors">
            בטל
          </button>
        </div>
      )}
    </div>
  );
}
