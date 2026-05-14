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
  description: string;
  max_ice_cream_per_slot: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_min: number;
}

const inputCls =
  "w-full bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300";
const inputErrorCls =
  "w-full bg-white border-2 border-red-400 focus:border-red-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300";

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
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      description: event.description ?? "",
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
    const msg = event.status === "draft"
      ? "למחוק את האירוע? פעולה זו אינה ניתנת לביטול."
      : `למחוק את האירוע "${event.title}"?\n\nכל ההזמנות, הסלוטים והתפריט ימחקו לצמיתות. פעולה זו אינה ניתנת לביטול.`;
    if (!window.confirm(msg)) return;
    try {
      await adminDeleteEvent(event.id);
      onBack();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleEditSave = async () => {
    console.log("[handleEditSave] called, editForm=", editForm);
    setError(null);
    setIsSaving(true);
    try {
      const payload: EventUpdatePayload = {};
      if (editForm.title !== undefined) payload.title = editForm.title;
      if (editForm.description !== undefined) payload.description = editForm.description !== "" ? editForm.description : null;
      if (editForm.max_ice_cream_per_slot !== undefined) payload.max_ice_cream_per_slot = editForm.max_ice_cream_per_slot;
      if (event.status === "draft") {
        if (editForm.date !== undefined) payload.date = editForm.date;
        if (editForm.start_time !== undefined) payload.start_time = editForm.start_time;
        if (editForm.end_time !== undefined) payload.end_time = editForm.end_time;
        if (editForm.slot_duration_min !== undefined) payload.slot_duration_min = editForm.slot_duration_min;
      }
      console.log("[handleEditSave] payload=", payload, "event.id=", event.id);
      const updated = await adminUpdateEvent(event.id, payload);
      console.log("[handleEditSave] success, updated=", updated);
      setEvent(updated);
      setIsEditing(false);
      setHighlightPublishError(false);
    } catch (err: unknown) {
      const apiErr = toApiError(err);
      console.error("[handleEditSave] error=", apiErr);
      setError(apiErr.message || "שגיאה לא ידועה");
    } finally {
      setIsSaving(false);
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

  const handleSaveQty = async (itemId: string) => {
    const parsed = parseInt(editingQtyValue);
    if (isNaN(parsed) || parsed < 1) return;
    try {
      await adminUpdateMenuItem(itemId, { quantity_available: parsed });
      setEditingQtyId(null);
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
      <button onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-caramel-600 hover:text-chocolate transition-colors mb-5">
        ‹ חזרה לרשימת אירועים
      </button>

      {/* Event header card */}
      <div className="bg-white border border-caramel-100 rounded-2xl shadow-card p-5 mb-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-xl text-chocolate">{event.title}</h2>
            <p className="text-caramel-500 text-sm mt-0.5">
              {formatDate(event.date)} · {formatTimeRange(event.start_time, event.end_time)} · כל {event.slot_duration_min} דקות
            </p>
            {event.description && (
              <p className="text-caramel-600 text-sm mt-1.5 leading-relaxed">{event.description}</p>
            )}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
            event.status === "draft" ? "bg-caramel-100 text-caramel-600" :
            event.status === "published" ? "bg-green-100 text-green-700" :
            event.status === "completed" ? "bg-blue-100 text-blue-700" :
            "bg-red-100 text-red-600"
          }`}>
            {STATUS_LABELS[event.status]}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {!isEditing ? (
          <div className="flex flex-wrap gap-2">
            {event.status === "draft" && (
              <>
                <button onClick={startEditing}
                  className="bg-parchment border border-caramel-200 text-chocolate px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-100 transition-colors">
                  עריכה
                </button>
                <button onClick={handlePublish}
                  className="bg-pistachio text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  פרסם אירוע
                </button>
                <button onClick={handleCancel}
                  className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">
                  בטל אירוע
                </button>
              </>
            )}
            {event.status === "published" && (
              <>
                <button onClick={startEditing}
                  className="bg-parchment border border-caramel-200 text-chocolate px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-100 transition-colors">
                  עריכה
                </button>
                <button onClick={handleComplete}
                  className="bg-caramel-500 text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-600 transition-colors">
                  סגור אירוע
                </button>
                <button onClick={handleCancel}
                  className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">
                  בטל אירוע
                </button>
              </>
            )}
            {/* Delete available for all statuses */}
            <button onClick={handleDelete}
              className="bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
              מחק אירוע
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <input placeholder="שם האירוע" value={editForm.title ?? ""}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className={inputCls} />
            <textarea placeholder="תיאור קצר על הקונספט (יוצג ללקוחות)" value={editForm.description ?? ""}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300 resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <div className={lockedFields ? "col-span-2" : ""}>
                <label className="block text-xs font-semibold text-caramel-500 mb-1">מקסימום מנות גלידה לסלוט</label>
                <input type="number" min="1" value={editForm.max_ice_cream_per_slot ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, max_ice_cream_per_slot: e.target.valueAsNumber })}
                  className={inputCls} />
              </div>
              {!lockedFields && (
                <>
                  <input type="date" value={editForm.date ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className={inputCls} />
                  <input type="time" value={editForm.start_time ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className={highlightPublishError ? inputErrorCls : inputCls} />
                  <input type="time" value={editForm.end_time ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className={highlightPublishError ? inputErrorCls : inputCls} />
                  <input type="number" min="1" value={editForm.slot_duration_min ?? ""} placeholder="משך סלוט (דקות)"
                    onChange={(e) => setEditForm({ ...editForm, slot_duration_min: e.target.valueAsNumber })}
                    className={highlightPublishError ? inputErrorCls : inputCls} />
                </>
              )}
            </div>
            {lockedFields && (
              <p className="text-amber-700 text-xs bg-amber-50 border border-amber-100 p-2 rounded-xl">
                תאריך, שעות ומשך הסלוט נעולים לאחר פרסום האירוע
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { void handleEditSave(); }}
                disabled={isSaving}
                className="bg-chocolate text-cream px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors disabled:opacity-50">
                {isSaving ? "שומר..." : "שמור"}
              </button>
              <button onClick={() => { setIsEditing(false); setHighlightPublishError(false); }}
                className="bg-parchment border border-caramel-200 text-chocolate px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-100 transition-colors">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("menu")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "menu" ? "bg-chocolate text-cream" : "bg-white border border-caramel-200 text-chocolate hover:bg-caramel-50"
          }`}>
          תפריט
        </button>
        <button onClick={() => setTab("slots")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "slots" ? "bg-chocolate text-cream" : "bg-white border border-caramel-200 text-chocolate hover:bg-caramel-50"
          }`}>
          סלוטים והזמנות
        </button>
      </div>

      {/* Menu tab */}
      {tab === "menu" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-bold text-chocolate">פריטי תפריט</h3>
            <button onClick={() => setShowAddItem(true)}
              className="bg-chocolate text-cream px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors shadow-button">
              + הוסף פריט
            </button>
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
              <div key={item.id}
                className={`bg-white border border-caramel-100 rounded-2xl shadow-card p-3 text-sm ${!item.is_active ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-chocolate">{item.product_name}</span>
                    <span className="text-caramel-500 mr-2">₪{item.price.toFixed(2)}</span>
                    {item.ice_cream_addon_price !== null && (
                      <span className="text-caramel-400 text-xs">+₪{item.ice_cream_addon_price.toFixed(2)} גלידה</span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleToggleActive(item.id, item.is_active)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        item.is_active
                          ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                          : "bg-pistachio-pale border border-pistachio-light text-pistachio hover:bg-green-100"
                      }`}>
                      {item.is_active ? "השבת" : "הפעל"}
                    </button>
                    <button onClick={() => handleRemoveItem(item.id)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-colors font-medium">
                      הסר
                    </button>
                  </div>
                </div>

                {/* Quantity row */}
                <div className="mt-2 flex items-center gap-2">
                  {editingQtyId === item.id ? (
                    <>
                      <input
                        type="number"
                        min="1"
                        value={editingQtyValue}
                        onChange={(e) => setEditingQtyValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleSaveQty(item.id); if (e.key === "Escape") setEditingQtyId(null); }}
                        autoFocus
                        className="w-20 bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-2 py-1 text-sm text-chocolate outline-none transition-colors"
                      />
                      <button onClick={() => void handleSaveQty(item.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-chocolate text-cream font-medium hover:bg-chocolate-light transition-colors">
                        שמור
                      </button>
                      <button onClick={() => setEditingQtyId(null)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-parchment border border-caramel-200 text-chocolate font-medium hover:bg-caramel-100 transition-colors">
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditingQtyId(item.id); setEditingQtyValue(String(item.quantity_available)); }}
                      className="text-xs text-caramel-500 hover:text-chocolate transition-colors font-medium"
                    >
                      כמות: {item.quantity_available} ✎
                    </button>
                  )}
                </div>
              </div>
            ))}
            {menuItems.length === 0 && !showAddItem && (
              <p className="text-caramel-400 text-sm text-center py-6">אין פריטים בתפריט</p>
            )}
          </div>
        </div>
      )}

      {/* Slots tab */}
      {tab === "slots" && (
        <>
          <SlotGrid eventId={event.id} />
          {slotlessOrders.length > 0 && (
            <div className="mt-6">
              <h3 className="font-display font-bold text-chocolate mb-3">
                הזמנות ללא סלוט ({slotlessOrders.length})
              </h3>
              <div className="space-y-2">
                {slotlessOrders.map((order) => (
                  <div key={order.id}
                    className="bg-white border border-caramel-100 rounded-2xl shadow-card p-3 text-sm flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-chocolate">{order.customer_name}</span>
                      <span className={`text-xs mr-2 px-1.5 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <div className="text-xs text-caramel-400 mt-0.5">
                        {order.items.map((oi) => `${oi.product_name} ×${oi.quantity}`).join(", ")}
                      </div>
                      {order.notes && <div className="text-xs text-amber-600 mt-0.5">הערה: {order.notes}</div>}
                      <div className="text-xs text-caramel-400 mt-0.5">
                        הוזמן: {formatTime(order.created_at)}
                      </div>
                    </div>
                    {order.status === "confirmed" && (
                      <div className="flex gap-1">
                        <button onClick={() => handlePickupSlotless(order.id)}
                          className="text-xs bg-caramel-500 text-white px-2 py-1 rounded-lg font-medium hover:bg-caramel-600 transition-colors">
                          אשר איסוף
                        </button>
                        <button onClick={() => handleCancelSlotless(order.id)}
                          className="text-xs bg-red-50 border border-red-100 text-red-600 px-2 py-1 rounded-lg font-medium hover:bg-red-100 transition-colors">
                          בטל
                        </button>
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
  const [localProducts, setLocalProducts] = useState(products);
  const [form, setForm] = useState({ product_id: "", quantity_available: "10", price: "", ice_cream_addon_price: "" });
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<{ name: string; description: string; ice_cream_mode: IceCreamMode }>({
    name: "", description: "", ice_cream_mode: "none",
  });

  const handleCreateProduct = async () => {
    try {
      const p = await adminCreateProduct(newProduct);
      setLocalProducts((prev) => [...prev, p]);
      setForm((f) => ({ ...f, product_id: p.id }));
      setShowNewProduct(false);
      setNewProduct({ name: "", description: "", ice_cream_mode: "none" });
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
    <div className="bg-white border border-caramel-100 rounded-2xl shadow-card p-4 mb-3 text-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block font-semibold text-chocolate mb-1.5">מוצר</label>
            <select value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className={inputCls} required>
              <option value="">בחר מוצר</option>
              {localProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.ice_cream_mode})</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => setShowNewProduct(true)}
            className="bg-parchment border border-caramel-200 text-chocolate px-3 py-2 rounded-xl text-xs font-semibold hover:bg-caramel-100 transition-colors whitespace-nowrap">
            מוצר חדש
          </button>
        </div>

        {showNewProduct && (
          <div className="bg-caramel-50 border border-caramel-100 p-3 rounded-xl space-y-2">
            <input placeholder="שם המוצר" value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className={inputCls} />
            <input placeholder="תיאור (אופציונלי)" value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className={inputCls} />
            <select value={newProduct.ice_cream_mode}
              onChange={(e) => {
                const v = e.target.value;
                if ((ICE_CREAM_MODES as string[]).includes(v)) {
                  setNewProduct({ ...newProduct, ice_cream_mode: v as IceCreamMode });
                }
              }}
              className={inputCls}>
              {ICE_CREAM_MODES.map((m) => (
                <option key={m} value={m}>{ICE_CREAM_MODE_LABELS[m]}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleCreateProduct()}
                className="bg-chocolate text-cream px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-chocolate-light transition-colors">
                צור מוצר
              </button>
              <button type="button" onClick={() => setShowNewProduct(false)}
                className="bg-parchment border border-caramel-200 text-chocolate px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-caramel-100 transition-colors">
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-semibold text-chocolate mb-1.5">כמות זמינה</label>
            <input type="number" min="1" value={form.quantity_available}
              onChange={(e) => setForm({ ...form, quantity_available: e.target.value })}
              className={inputCls} required />
          </div>
          <div>
            <label className="block font-semibold text-chocolate mb-1.5">מחיר (₪)</label>
            <input type="number" step="0.01" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={inputCls} required />
          </div>
          <div className="col-span-2">
            <label className="block font-semibold text-chocolate mb-1.5">תוספת גלידה (₪, אופציונלי)</label>
            <input type="number" step="0.01" value={form.ice_cream_addon_price}
              onChange={(e) => setForm({ ...form, ice_cream_addon_price: e.target.value })}
              className={inputCls} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="bg-chocolate text-cream px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors">
            הוסף
          </button>
          <button type="button" onClick={() => onDone()}
            className="bg-parchment border border-caramel-200 text-chocolate px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-100 transition-colors">
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
