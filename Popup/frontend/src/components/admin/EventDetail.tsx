import { useEffect, useState, type FormEvent } from "react";
import type { EventOut, EventMenuItemOut, ProductOut, EventUpdatePayload, IceCreamMode, OrderOut } from "../../api/types";
// IceCreamMode is still needed for AddMenuItemPanel's newProduct state
import {
  adminPublishEvent, adminCompleteEvent, adminCancelEvent, adminDeleteEvent,
  adminListMenuItems, adminAddMenuItem, adminUpdateMenuItem, adminDeleteMenuItem,
  adminListProducts, adminCreateProduct, adminUpdateEvent, adminListOrders,
  adminPickupOrder, adminCancelOrder, toApiError,
} from "../../api/client";
import SlotGrid from "./SlotGrid";
import { STATUS_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ICE_CREAM_MODES, ICE_CREAM_MODE_LABELS } from "../../utils/eventStatus";
import { formatDate, formatTimeRange, formatTime } from "../../utils/format";

interface Props {
  event: EventOut;
  onBack: () => void;
  onAction: () => void;
}

interface EventEditForm {
  title: string;
  max_ice_cream_per_slot: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_min: number;
}


export default function EventDetail({ event: initialEvent, onBack, onAction }: Props) {
  const [event, setEvent] = useState(initialEvent);
  const [menuItems, setMenuItems] = useState<EventMenuItemOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"menu" | "slots">("menu");
  const [editForm, setEditForm] = useState<Partial<EventEditForm>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [slotlessOrders, setSlotlessOrders] = useState<OrderOut[]>([]);
  const [highlightPublishError, setHighlightPublishError] = useState(false);

  const loadMenu = () =>
    adminListMenuItems(event.id).then(setMenuItems).catch((e: unknown) => setError(toApiError(e).message));

  const loadProducts = () =>
    adminListProducts().then(setProducts).catch((e: unknown) => setError(toApiError(e).message));

  const loadSlotlessOrders = () =>
    adminListOrders(event.id)
      .then((orders) => setSlotlessOrders(orders.filter((o) => o.slot_id === null)))
      .catch((e: unknown) => setError(toApiError(e).message));

  useEffect(() => { loadMenu(); loadProducts(); loadSlotlessOrders(); }, [event.id]);

  const startEditing = () => {
    setEditForm({
      title: event.title,
      max_ice_cream_per_slot: event.max_ice_cream_per_slot,
      date: event.date,
      start_time: event.start_time.slice(0, 5),
      end_time: event.end_time.slice(0, 5),
      slot_duration_min: event.slot_duration_min,
    });
    setIsEditing(true);
  };

  const doAction = async (fn: () => Promise<EventOut | void>, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setError(null);
    try {
      const result = await fn();
      if (result) setEvent(result);
      onAction();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm("לפרסם את האירוע ולייצר סלוטים?")) return;
    setError(null);
    try {
      const result = await adminPublishEvent(event.id);
      setEvent(result);
      onAction();
    } catch (err: unknown) {
      const e = toApiError(err);
      if (e.status === 409 && e.message.includes("מתחלק")) {
        setError("טווח הזמן אינו מתחלק בשווה — שנה את משך הסלוט או שעות הפעילות");
        setHighlightPublishError(true);
        startEditing();
      } else {
        setError(e.message || "שגיאה בפרסום האירוע — אנא נסה שוב");
      }
    }
  };

  const handleComplete = () =>
    doAction(() => adminCompleteEvent(event.id), "לסגור את האירוע? לא יתקבלו הזמנות חדשות.");

  const handleCancel = () =>
    doAction(() => adminCancelEvent(event.id), "לבטל את האירוע? הזמנות קיימות לא יבוטלו.");

  const handleDelete = async () => {
    if (!window.confirm("למחוק את האירוע? פעולה זו אינה ניתנת לביטול.")) return;
    try {
      await adminDeleteEvent(event.id);
      onBack();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleEditSave = async () => {
    try {
      const payload: EventUpdatePayload = {};
      if (editForm.title !== undefined) payload.title = editForm.title;
      if (editForm.max_ice_cream_per_slot !== undefined) payload.max_ice_cream_per_slot = editForm.max_ice_cream_per_slot;
      if (event.status === "draft") {
        if (editForm.date !== undefined) payload.date = editForm.date;
        if (editForm.start_time !== undefined) payload.start_time = editForm.start_time;
        if (editForm.end_time !== undefined) payload.end_time = editForm.end_time;
        if (editForm.slot_duration_min !== undefined) payload.slot_duration_min = editForm.slot_duration_min;
      }
      const updated = await adminUpdateEvent(event.id, payload);
      setEvent(updated);
      setIsEditing(false);
      setHighlightPublishError(false);
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleToggleActive = async (itemId: string, isActive: boolean) => {
    try {
      await adminUpdateMenuItem(itemId, { is_active: !isActive });
      loadMenu();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!window.confirm("להסיר פריט מהתפריט?")) return;
    try {
      await adminDeleteMenuItem(itemId);
      loadMenu();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handlePickupSlotless = async (orderId: string) => {
    if (!window.confirm("לאשר איסוף? פעולה זו אינה ניתנת לביטול.")) return;
    try {
      await adminPickupOrder(orderId);
      loadSlotlessOrders();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleCancelSlotless = async (orderId: string) => {
    if (!window.confirm("לבטל הזמנה זו?")) return;
    try {
      await adminCancelOrder(orderId);
      loadSlotlessOrders();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const lockedFields = event.status !== "draft";

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 mb-4">
        &rsaquo; חזרה לרשימת אירועים
      </button>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-xl font-bold">{event.title}</h2>
            <p className="text-gray-500 text-sm">
              {formatDate(event.date)} · {formatTimeRange(event.start_time, event.end_time)} · כל {event.slot_duration_min} דקות
            </p>
          </div>
          <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded-full">
            {STATUS_LABELS[event.status]}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">
            {error}
          </div>
        )}

        {!isEditing ? (
          <div className="flex flex-wrap gap-2">
            {event.status === "draft" && (
              <>
                <button onClick={startEditing} className="border px-3 py-1 rounded text-sm">עריכה</button>
                <button onClick={handlePublish} className="bg-green-500 text-white px-3 py-1 rounded text-sm">פרסם אירוע</button>
                <button onClick={handleDelete} className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm">מחק</button>
                <button onClick={handleCancel} className="bg-orange-100 text-orange-600 px-3 py-1 rounded text-sm">בטל אירוע</button>
              </>
            )}
            {event.status === "published" && (
              <>
                <button onClick={startEditing} className="border px-3 py-1 rounded text-sm">עריכה</button>
                <button onClick={handleComplete} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">סגור אירוע</button>
                <button onClick={handleCancel} className="bg-orange-100 text-orange-600 px-3 py-1 rounded text-sm">בטל אירוע</button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <input placeholder="שם האירוע" value={editForm.title ?? ""}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full border rounded px-2 py-1" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="מקסימום גלידה לסלוט" value={editForm.max_ice_cream_per_slot ?? ""}
                type="number" min="1" onChange={(e) => setEditForm({ ...editForm, max_ice_cream_per_slot: e.target.valueAsNumber })}
                className="border rounded px-2 py-1" />
              {!lockedFields ? (
                <>
                  <input type="date" value={editForm.date ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="border rounded px-2 py-1" />
                  <input type="time" value={editForm.start_time ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className={`border rounded px-2 py-1 ${highlightPublishError ? "border-red-500" : ""}`} />
                  <input type="time" value={editForm.end_time ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className={`border rounded px-2 py-1 ${highlightPublishError ? "border-red-500" : ""}`} />
                  <input type="number" min="1" value={editForm.slot_duration_min ?? ""} placeholder="משך סלוט"
                    onChange={(e) => setEditForm({ ...editForm, slot_duration_min: e.target.valueAsNumber })}
                    className={`border rounded px-2 py-1 ${highlightPublishError ? "border-red-500" : ""}`} />
                </>
              ) : (
                <p className="col-span-2 text-yellow-700 text-xs bg-yellow-50 p-2 rounded">
                  תאריך, שעות ומשך הסלוט נעולים לאחר פרסום האירוע
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleEditSave} className="bg-pink-500 text-white px-3 py-1 rounded text-sm">שמור</button>
              <button onClick={() => { setIsEditing(false); setHighlightPublishError(false); }} className="border px-3 py-1 rounded text-sm">ביטול</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("menu")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "menu" ? "bg-pink-500 text-white" : "bg-white border"}`}>תפריט</button>
        <button onClick={() => setTab("slots")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "slots" ? "bg-pink-500 text-white" : "bg-white border"}`}>סלוטים והזמנות</button>
      </div>

      {tab === "menu" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">פריטי תפריט</h3>
            <button onClick={() => setShowAddItem(true)} className="text-sm bg-pink-500 text-white px-3 py-1 rounded">+ הוסף פריט</button>
          </div>

          {showAddItem && (
            <AddMenuItemPanel
              eventId={event.id}
              products={products}
              onDone={(reload) => { setShowAddItem(false); if (reload) { loadMenu(); loadProducts(); } }}
              onError={setError}
            />
          )}

          <div className="space-y-2">
            {menuItems.map((item) => (
              <div key={item.id} className={`bg-white border rounded-xl p-3 flex justify-between items-center text-sm ${!item.is_active ? "opacity-60" : ""}`}>
                <div>
                  <span className="font-medium">{item.product_name}</span>
                  <span className="text-gray-500 mr-2">₪{item.price.toFixed(2)}</span>
                  {item.ice_cream_addon_price !== null && <span className="text-gray-400 text-xs">+₪{item.ice_cream_addon_price.toFixed(2)} גלידה</span>}
                  <span className="text-xs text-gray-400 mr-2">כמות: {item.quantity_available}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleActive(item.id, item.is_active)}
                    className={`text-xs px-2 py-1 rounded ${item.is_active ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {item.is_active ? "השבת" : "הפעל"}
                  </button>
                  <button onClick={() => handleRemoveItem(item.id)}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-600">הסר</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "slots" && (
        <>
          <SlotGrid eventId={event.id} />
          {slotlessOrders.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">הזמנות ללא סלוט ({slotlessOrders.length})</h3>
              <div className="space-y-2">
                {slotlessOrders.map((order) => (
                  <div key={order.id} className="bg-white border rounded-xl p-3 text-sm flex justify-between items-start">
                    <div>
                      <span className="font-medium">{order.customer_name}</span>
                      <span className={`text-xs mr-2 px-1.5 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {order.items.map((oi) => `${oi.product_name} ×${oi.quantity}`).join(", ")}
                      </div>
                      {order.notes && <div className="text-xs text-orange-600 mt-0.5">הערה: {order.notes}</div>}
                      <div className="text-xs text-gray-500 mt-0.5">
                        הוזמן: {formatTime(order.created_at)}
                      </div>
                    </div>
                    {order.status === "confirmed" && (
                      <div className="flex gap-1">
                        <button onClick={() => handlePickupSlotless(order.id)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">אשר איסוף</button>
                        <button onClick={() => handleCancelSlotless(order.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">בטל</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface AddMenuItemPanelProps {
  eventId: string;
  products: ProductOut[];
  onDone: (reload?: boolean) => void;
  onError: (msg: string) => void;
}

function AddMenuItemPanel({ eventId, products, onDone, onError }: AddMenuItemPanelProps) {
  const [form, setForm] = useState({ product_id: "", quantity_available: "10", price: "", ice_cream_addon_price: "" });
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<{ name: string; description: string; ice_cream_mode: IceCreamMode }>({
    name: "", description: "", ice_cream_mode: "none",
  });

  const handleCreateProduct = async () => {
    try {
      const p = await adminCreateProduct(newProduct);
      setForm((f) => ({ ...f, product_id: p.id }));
      setShowNewProduct(false);
    } catch (err: unknown) {
      onError(toApiError(err).message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await adminAddMenuItem(eventId, {
        product_id: form.product_id,
        quantity_available: parseInt(form.quantity_available),
        price: parseFloat(form.price),
        ice_cream_addon_price: form.ice_cream_addon_price ? parseFloat(form.ice_cream_addon_price) : null,
      });
      onDone(true);
    } catch (err: unknown) {
      onError(toApiError(err).message);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-4 mb-3 text-sm">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block mb-1">מוצר</label>
            <select value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full border rounded px-2 py-1" required>
              <option value="">בחר מוצר</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.ice_cream_mode})</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => setShowNewProduct(true)} className="text-xs border px-2 py-1 rounded">מוצר חדש</button>
        </div>
        {showNewProduct && (
          <div className="bg-gray-50 p-3 rounded space-y-2">
            <input placeholder="שם המוצר" value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full border rounded px-2 py-1" />
            <input placeholder="תיאור (אופציונלי)" value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="w-full border rounded px-2 py-1" />
            <select value={newProduct.ice_cream_mode}
              onChange={(e) => {
                const v = e.target.value;
                if ((ICE_CREAM_MODES as string[]).includes(v)) {
                  setNewProduct({ ...newProduct, ice_cream_mode: v as IceCreamMode });
                }
              }}
              className="w-full border rounded px-2 py-1">
              {ICE_CREAM_MODES.map((m) => (
                <option key={m} value={m}>{ICE_CREAM_MODE_LABELS[m]}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleCreateProduct()}
                className="bg-gray-700 text-white px-3 py-1 rounded text-xs">צור מוצר</button>
              <button type="button" onClick={() => setShowNewProduct(false)} className="border px-3 py-1 rounded text-xs">ביטול</button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1">כמות זמינה</label>
            <input type="number" min="1" value={form.quantity_available}
              onChange={(e) => setForm({ ...form, quantity_available: e.target.value })}
              className="w-full border rounded px-2 py-1" required />
          </div>
          <div>
            <label className="block mb-1">מחיר (₪)</label>
            <input type="number" step="0.01" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border rounded px-2 py-1" required />
          </div>
          <div className="col-span-2">
            <label className="block mb-1">תוספת גלידה (₪, אופציונלי)</label>
            <input type="number" step="0.01" value={form.ice_cream_addon_price}
              onChange={(e) => setForm({ ...form, ice_cream_addon_price: e.target.value })}
              className="w-full border rounded px-2 py-1" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-pink-500 text-white px-3 py-1 rounded">הוסף</button>
          <button type="button" onClick={() => onDone()} className="border px-3 py-1 rounded">ביטול</button>
        </div>
      </form>
    </div>
  );
}
