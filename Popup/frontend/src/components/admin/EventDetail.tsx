import { useEffect, useState, useMemo, type FormEvent } from "react";
import type { EventOut, EventMenuItemOut, ProductOut, EventUpdatePayload, IceCreamMode, OrderOut, SlotAdminOut, SurveyResultsOut, SurveyFixedProductOut } from "../../api/types";
// IceCreamMode is still needed for AddMenuItemPanel's newProduct state
import {
  adminPublishEvent, adminCompleteEvent, adminReopenEvent, adminCancelEvent, adminDeleteEvent,
  adminListMenuItems, adminAddMenuItem, adminUpdateMenuItem, adminDeleteMenuItem,
  adminReorderMenuItems, adminListProducts, adminCreateProduct, adminUpdateEvent, adminListOrders,
  adminPickupOrder, adminCancelOrder, adminDeleteOrder, adminRemoveOrderItem, adminUpdateOrderItem,
  adminListSlots, adminUpdateOrderSlot, toApiError,
  adminStartSurvey, adminGetSurveyResults, adminFinalizeSurvey,
  adminListSurveyFixed,
} from "../../api/client";
import SlotGrid from "./SlotGrid";
import { STATUS_LABELS, STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ICE_CREAM_MODES, ICE_CREAM_MODE_LABELS } from "../../utils/eventStatus";
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
  max_ice_cream_total: number | null;
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
  const [tab, setTab] = useState<"menu" | "slots" | "orders">("menu");
  const [editForm, setEditForm] = useState<Partial<EventEditForm>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [slotlessOrders, setSlotlessOrders] = useState<OrderOut[]>([]);
  const [allOrders, setAllOrders] = useState<OrderOut[]>([]);
  const [ordersView, setOrdersView] = useState<"by-order" | "by-product">("by-order");
  const [highlightPublishError, setHighlightPublishError] = useState(false);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingQtys, setEditingQtys] = useState<Record<string, number>>({});
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);
  const [slots, setSlots] = useState<SlotAdminOut[]>([]);
  const [movingSlotOrderId, setMovingSlotOrderId] = useState<string | null>(null);
  const [movingSlotValue, setMovingSlotValue] = useState<string>("");

  // Survey state
  const [showStartSurvey, setShowStartSurvey] = useState(false);
  const [surveyResults, setSurveyResults] = useState<SurveyResultsOut | null>(null);
  const [surveyFixed, setSurveyFixed] = useState<SurveyFixedProductOut[]>([]);

  const loadMenu = () =>
    adminListMenuItems(event.id).then(setMenuItems).catch((e: unknown) => setError(toApiError(e).message));

  const loadProducts = () =>
    adminListProducts().then(setProducts).catch((e: unknown) => setError(toApiError(e).message));

  const loadOrders = () =>
    adminListOrders(event.id)
      .then((orders) => {
        setAllOrders(orders);
        setSlotlessOrders(orders.filter((o) => o.slot_id === null));
      })
      .catch((e: unknown) => setError(toApiError(e).message));

  const loadSlots = () =>
    adminListSlots(event.id).then(setSlots).catch((e: unknown) => setError(toApiError(e).message));

  useEffect(() => {
    loadMenu(); loadProducts(); loadOrders(); loadSlots();
    if (event.status === "survey") {
      adminGetSurveyResults(event.id).then(setSurveyResults).catch(() => null);
      adminListSurveyFixed(event.id).then(setSurveyFixed).catch(() => null);
    }
  }, [event.id, event.status]);

  const slotMap = useMemo(() => new Map(slots.map((s) => [s.id, s])), [slots]);

  const startEditing = () => {
    setEditForm({
      title: event.title,
      description: event.description ?? "",
      max_ice_cream_per_slot: event.max_ice_cream_per_slot,
      max_ice_cream_total: event.max_ice_cream_total ?? null,
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

  const handleReopen = () =>
    doAction(() => adminReopenEvent(event.id), "לפתוח מחדש את האירוע? הוא יחזור להיות פעיל ויתקבלו הזמנות חדשות.");

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
      if ("max_ice_cream_total" in editForm) payload.max_ice_cream_total = editForm.max_ice_cream_total ?? null;
      if (event.status === "draft") {
        if (editForm.date !== undefined) payload.date = editForm.date;
        if (editForm.start_time !== undefined) payload.start_time = editForm.start_time;
        if (editForm.slot_duration_min !== undefined) payload.slot_duration_min = editForm.slot_duration_min;
      }
      // end_time is editable on draft and live (published) events
      if ((event.status === "draft" || event.status === "published") && editForm.end_time !== undefined) {
        payload.end_time = editForm.end_time;
      }
      console.log("[handleEditSave] payload=", payload, "event.id=", event.id);
      const updated = await adminUpdateEvent(event.id, payload);
      console.log("[handleEditSave] success, updated=", updated);
      setEvent(updated);
      setIsEditing(false);
      setHighlightPublishError(false);
      // end_time changes on a live event add/remove slots — refresh slot views
      loadSlots();
      setSlotRefreshKey((k) => k + 1);
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
      loadOrders();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleCancelSlotless = async (orderId: string) => {
    if (!window.confirm("לבטל הזמנה זו?")) return;
    try {
      await adminCancelOrder(orderId);
      loadOrders();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("למחוק הזמנה זו לצמיתות?")) return;
    try {
      await adminDeleteOrder(orderId);
      setAllOrders((prev) => prev.filter((o) => o.id !== orderId));
      setSlotlessOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (editingOrderId === orderId) setEditingOrderId(null);
      setSlotRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const startEditOrder = (order: OrderOut) => {
    setEditingOrderId(order.id);
    const qtys: Record<string, number> = {};
    for (const oi of order.items) qtys[oi.id] = oi.quantity;
    setEditingQtys(qtys);
  };

  const handleSaveOrderEdit = async (orderId: string, originalItems: OrderOut["items"]) => {
    try {
      let updatedOrder: OrderOut | null = null;
      for (const oi of originalItems) {
        const newQty = editingQtys[oi.id];
        if (newQty === undefined) continue;
        if (newQty === 0) {
          updatedOrder = await adminRemoveOrderItem(oi.id);
        } else if (newQty !== oi.quantity) {
          updatedOrder = await adminUpdateOrderItem(oi.id, newQty);
        }
      }
      if (updatedOrder === null) {
        // order was fully deleted (last item removed)
        setAllOrders((prev) => prev.filter((o) => o.id !== orderId));
        setSlotlessOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setAllOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder! : o)));
        setSlotlessOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder! : o)));
      }
      setEditingOrderId(null);
      setSlotRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleMoveSlot = async (orderId: string) => {
    try {
      const updated = await adminUpdateOrderSlot(orderId, movingSlotValue || null);
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setSlotlessOrders((prev) => {
        const without = prev.filter((o) => o.id !== orderId);
        return updated.slot_id === null ? [...without, updated] : without;
      });
      setMovingSlotOrderId(null);
      setSlotRefreshKey((k) => k + 1);
      loadSlots();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleFinalizeSurvey = async () => {
    if (!window.confirm("לסיים את הסקר ולפרסם את האירוע? פעולה זו אינה ניתנת לביטול.")) return;
    setError(null);
    try {
      const result = await adminFinalizeSurvey(event.id);
      setEvent(result);
      onAction();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  const handleDrop = async (targetIdx: number) => {
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) {
      setDragSrcIdx(null); setDragOverIdx(null);
      return;
    }
    const reordered = [...menuItems];
    const [moved] = reordered.splice(dragSrcIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setMenuItems(reordered);
    setDragSrcIdx(null); setDragOverIdx(null);
    try {
      await adminReorderMenuItems(event.id, reordered.map((i) => i.id));
    } catch (err: unknown) {
      setError(toApiError(err).message);
      loadMenu();
    }
  };

  const lockedFields = event.status !== "draft";

  const productStats = useMemo(() => {
    const orderedQty: Record<string, number> = {};
    const buyers: Record<string, { customerName: string; qty: number; withIceCream: number }[]> = {};
    for (const order of allOrders) {
      if (order.status === "cancelled") continue;
      const byItem: Record<string, { qty: number; withIceCream: number }> = {};
      for (const oi of order.items) {
        if (!byItem[oi.event_menu_item_id]) byItem[oi.event_menu_item_id] = { qty: 0, withIceCream: 0 };
        byItem[oi.event_menu_item_id].qty += oi.quantity;
        if (oi.with_ice_cream) byItem[oi.event_menu_item_id].withIceCream += oi.quantity;
      }
      for (const [emiId, data] of Object.entries(byItem)) {
        orderedQty[emiId] = (orderedQty[emiId] ?? 0) + data.qty;
        if (!buyers[emiId]) buyers[emiId] = [];
        buyers[emiId].push({ customerName: order.customer_name, qty: data.qty, withIceCream: data.withIceCream });
      }
    }
    return { orderedQty, buyers };
  }, [allOrders]);

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
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[event.status]}`}>
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
                <button onClick={() => setShowStartSurvey(true)}
                  className="bg-purple-100 border border-purple-200 text-purple-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-purple-200 transition-colors">
                  פתח סקר
                </button>
                <button onClick={handleCancel}
                  className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">
                  בטל אירוע
                </button>
              </>
            )}
            {event.status === "survey" && (
              <button onClick={handleFinalizeSurvey}
                className="bg-pistachio text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                סיים סקר ופרסם
              </button>
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
            {event.status === "completed" && (
              <button onClick={handleReopen}
                className="bg-pistachio text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                פתח מחדש
              </button>
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
                  onChange={(e) => { const v = e.target.valueAsNumber; if (!isNaN(v)) setEditForm({ ...editForm, max_ice_cream_per_slot: v }); }}
                  className={inputCls} />
              </div>
              <div className={lockedFields ? "col-span-2" : ""}>
                <label className="block text-xs font-semibold text-caramel-500 mb-1">מכסת גלידה כוללת לאירוע</label>
                <input
                  type="number"
                  min="1"
                  placeholder="השאר ריק ללא הגבלה"
                  value={editForm.max_ice_cream_total ?? ""}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    max_ice_cream_total: e.target.value !== "" ? e.target.valueAsNumber : null,
                  })}
                  className={inputCls}
                />
              </div>
              {!lockedFields && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-caramel-500 mb-1">תאריך</label>
                    <input type="date" value={editForm.date ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-caramel-500 mb-1">שעת התחלה</label>
                    <input type="time" value={editForm.start_time ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                      className={highlightPublishError ? inputErrorCls : inputCls} />
                  </div>
                </>
              )}
              {/* End time: editable on draft AND live (published) events */}
              {(event.status === "draft" || event.status === "published") && (
                <div className={lockedFields ? "col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-caramel-500 mb-1">שעת סיום</label>
                  <input type="time" value={editForm.end_time ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className={highlightPublishError ? inputErrorCls : inputCls} />
                </div>
              )}
              {!lockedFields && (
                <div>
                  <label className="block text-xs font-semibold text-caramel-500 mb-1">משך סלוט (דקות)</label>
                  <input type="number" min="1" value={editForm.slot_duration_min ?? ""} placeholder="משך סלוט (דקות)"
                    onChange={(e) => { const v = e.target.valueAsNumber; if (!isNaN(v)) setEditForm({ ...editForm, slot_duration_min: v }); }}
                    className={highlightPublishError ? inputErrorCls : inputCls} />
                </div>
              )}
            </div>
            {lockedFields && (
              <p className="text-amber-700 text-xs bg-amber-50 border border-amber-100 p-2 rounded-xl">
                תאריך, שעת ההתחלה ומשך הסלוט נעולים לאחר פרסום — ניתן לעדכן את שעת הסיום (סלוטים ייווצרו או יוסרו בהתאם)
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

      {/* Start Survey Panel */}
      {showStartSurvey && (
        <StartSurveyPanel
          event={event}
          products={products}
          onDone={(updatedEvent) => {
            setEvent(updatedEvent);
            setShowStartSurvey(false);
            onAction();
            adminGetSurveyResults(updatedEvent.id).then(setSurveyResults).catch(() => null);
            adminListSurveyFixed(updatedEvent.id).then(setSurveyFixed).catch(() => null);
          }}
          onCancel={() => setShowStartSurvey(false)}
          onError={setError}
        />
      )}

      {/* Survey Results */}
      {event.status === "survey" && surveyResults && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-bold text-purple-800">תוצאות סקר</h3>
            <div className="text-xs text-purple-600">
              {surveyResults.total_voters} מצביעים · נסגר {new Date(surveyResults.survey_ends_at).toLocaleString("he-IL")}
            </div>
          </div>
          <p className="text-xs text-purple-600 mb-3">
            {surveyResults.menu_size} מנות ייבחרו מהסקר + {surveyFixed.length} קבועות
          </p>
          <div className="space-y-1.5">
            {surveyResults.results.length === 0 && (
              <p className="text-xs text-purple-400">אין הצבעות עדיין</p>
            )}
            {surveyResults.results.map((r, idx) => (
              <div key={r.product_id} className={`flex items-center gap-2 text-sm ${idx < surveyResults.menu_size ? "text-purple-800 font-medium" : "text-purple-500"}`}>
                <span className="w-5 text-center text-xs">{idx + 1}</span>
                <span className="flex-1">{r.product_name}</span>
                <span className="text-xs bg-purple-100 px-2 py-0.5 rounded-full">{r.vote_count} קולות</span>
                {idx < surveyResults.menu_size && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ייכנס</span>
                )}
              </div>
            ))}
            {surveyFixed.map((fp) => (
              <div key={fp.id} className="flex items-center gap-2 text-sm text-purple-800 font-medium">
                <span className="w-5 text-center text-xs">★</span>
                <span className="flex-1">{fp.product.name}</span>
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">קבועה</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => adminGetSurveyResults(event.id).then(setSurveyResults).catch(() => null)}
            className="mt-3 text-xs text-purple-600 hover:text-purple-800 transition-colors"
          >
            רענן תוצאות
          </button>
        </div>
      )}

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
          סלוטים
        </button>
        <button onClick={() => setTab("orders")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "orders" ? "bg-chocolate text-cream" : "bg-white border border-caramel-200 text-chocolate hover:bg-caramel-50"
          }`}>
          הזמנות {allOrders.filter(o => o.status !== "cancelled").length > 0 && `(${allOrders.filter(o => o.status !== "cancelled").length})`}
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
            {menuItems.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragSrcIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={() => void handleDrop(idx)}
                onDragEnd={() => { setDragSrcIdx(null); setDragOverIdx(null); }}
                className={`bg-white border rounded-2xl shadow-card p-3 text-sm transition-colors select-none
                  ${!item.is_active ? "opacity-60" : ""}
                  ${dragOverIdx === idx && dragSrcIdx !== idx ? "border-caramel-400 bg-caramel-50" : "border-caramel-100"}
                  ${dragSrcIdx === idx ? "opacity-50" : ""}
                `}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-caramel-300 cursor-grab active:cursor-grabbing text-lg leading-none shrink-0"
                      title="גרור לסידור מחדש"
                    >
                      ⠿
                    </span>
                    <div>
                      <span className="font-semibold text-chocolate">{item.product_name}</span>
                      <span className="text-caramel-500 mr-2">₪{item.price.toFixed(2)}</span>
                      {item.ice_cream_addon_price !== null && (
                        <span className="text-caramel-400 text-xs">+₪{item.ice_cream_addon_price.toFixed(2)} גלידה</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
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
                <div className="mt-2 flex items-center gap-2 pr-7">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingQtyId(item.id); setEditingQtyValue(String(item.quantity_available)); }}
                        className="text-xs text-caramel-500 hover:text-chocolate transition-colors font-medium"
                      >
                        כמות: {item.quantity_available} ✎
                      </button>
                      {(() => {
                        const ordered = productStats.orderedQty[item.id] ?? 0;
                        const remaining = item.quantity_available - ordered;
                        return (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${remaining <= 0 ? "bg-red-100 text-red-600" : remaining <= 3 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            נשארו {remaining}
                          </span>
                        );
                      })()}
                    </div>
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
          <SlotGrid eventId={event.id} refreshKey={slotRefreshKey} />
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

      {/* Orders tab */}
      {tab === "orders" && (
        <div>
          {/* View toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrdersView("by-order")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                ordersView === "by-order" ? "bg-caramel-500 text-white" : "bg-white border border-caramel-200 text-chocolate hover:bg-caramel-50"
              }`}
            >
              לפי הזמנה
            </button>
            <button
              onClick={() => setOrdersView("by-product")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                ordersView === "by-product" ? "bg-caramel-500 text-white" : "bg-white border border-caramel-200 text-chocolate hover:bg-caramel-50"
              }`}
            >
              לפי מוצר
            </button>
          </div>

          {ordersView === "by-order" && (
            <div className="space-y-2">
              {allOrders.length === 0 && (
                <p className="text-center text-caramel-400 text-sm py-8">אין הזמנות עדיין</p>
              )}
              {[...allOrders]
                .sort((a, b) => {
                  // Sort by pickup (slot) time; orders without a slot go last.
                  const sa = a.slot_id ? slotMap.get(a.slot_id)?.slot_start ?? null : null;
                  const sb = b.slot_id ? slotMap.get(b.slot_id)?.slot_start ?? null : null;
                  if (sa === null && sb === null) return a.created_at.localeCompare(b.created_at);
                  if (sa === null) return 1;
                  if (sb === null) return -1;
                  const cmp = sa.localeCompare(sb);
                  return cmp !== 0 ? cmp : a.created_at.localeCompare(b.created_at);
                })
                .map((order, idx) => {
                  const isEditing = editingOrderId === order.id;
                  const canEdit = order.status !== "picked_up";
                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-caramel-100 rounded-2xl shadow-card p-3 text-sm"
                    >
                      {/* Header row */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-chocolate text-xs bg-caramel-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-chocolate">{order.customer_name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          {order.slot_id ? (
                            <span className="text-xs font-medium text-chocolate">
                              🕐 איסוף {formatTime(slotMap.get(order.slot_id)?.slot_start ?? "")}
                            </span>
                          ) : (
                            <span className="text-xs text-caramel-400">ללא שעת איסוף</span>
                          )}
                        </div>
                        {canEdit && !isEditing && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => startEditOrder(order)}
                              className="text-xs bg-parchment border border-caramel-200 text-chocolate px-2 py-1 rounded-lg font-medium hover:bg-caramel-100 transition-colors"
                            >
                              עריכה
                            </button>
                            <button
                              onClick={() => void handleDeleteOrder(order.id)}
                              className="text-xs bg-red-50 border border-red-100 text-red-600 px-2 py-1 rounded-lg font-medium hover:bg-red-100 transition-colors"
                            >
                              מחק
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Slot row */}
                      {!isEditing && (
                        <div className="mt-1.5 pr-8 flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-caramel-400">
                            {order.slot_id
                              ? `סלוט ${formatTime(slotMap.get(order.slot_id)?.slot_start ?? "")}`
                              : "ללא סלוט"}
                          </span>
                          {canEdit && movingSlotOrderId === order.id ? (
                            <>
                              <select
                                value={movingSlotValue}
                                onChange={(e) => setMovingSlotValue(e.target.value)}
                                className="border border-caramel-200 rounded-lg px-2 py-0.5 text-xs text-chocolate bg-white outline-none"
                              >
                                <option value="">ללא סלוט</option>
                                {slots.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {formatTime(s.slot_start)} ({s.booked_portions}/{s.max_ice_cream_effective})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => void handleMoveSlot(order.id)}
                                className="bg-chocolate text-cream px-2 py-0.5 rounded-lg font-medium hover:bg-chocolate-light transition-colors"
                              >
                                שמור
                              </button>
                              <button
                                onClick={() => setMovingSlotOrderId(null)}
                                className="text-caramel-400 hover:text-chocolate transition-colors"
                              >
                                ביטול
                              </button>
                            </>
                          ) : canEdit ? (
                            <button
                              onClick={() => { setMovingSlotOrderId(order.id); setMovingSlotValue(order.slot_id ?? ""); }}
                              className="text-caramel-400 hover:text-chocolate transition-colors"
                            >
                              שנה ✎
                            </button>
                          ) : null}
                        </div>
                      )}

                      {/* Items — view mode */}
                      {!isEditing && (
                        <div className="mt-2 space-y-0.5 pr-8">
                          {order.items.map((oi) => (
                            <div key={oi.id} className="text-caramel-700">
                              {oi.product_name} ×{oi.quantity}
                              {oi.with_ice_cream === true && <span className="text-caramel-400 text-xs"> (עם גלידה)</span>}
                              {oi.with_ice_cream === false && <span className="text-caramel-400 text-xs"> (ללא גלידה)</span>}
                            </div>
                          ))}
                          {order.notes && <p className="text-xs text-amber-600 mt-1">הערה: {order.notes}</p>}
                        </div>
                      )}

                      {/* Items — edit mode */}
                      {isEditing && (
                        <div className="mt-3 space-y-2 pr-8">
                          {order.items.map((oi) => {
                            const qty = editingQtys[oi.id] ?? oi.quantity;
                            return (
                              <div key={oi.id} className="flex items-center gap-2">
                                <span className="flex-1 text-caramel-700 text-xs">
                                  {oi.product_name}
                                  {oi.with_ice_cream === true && <span className="text-caramel-400"> (עם גלידה)</span>}
                                  {oi.with_ice_cream === false && <span className="text-caramel-400"> (ללא גלידה)</span>}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    setEditingQtys((p) => ({ ...p, [oi.id]: isNaN(v) ? 0 : v }));
                                  }}
                                  className="w-14 border-2 border-caramel-200 focus:border-caramel-500 rounded-lg px-2 py-0.5 text-sm text-chocolate outline-none text-center"
                                />
                                <button
                                  onClick={() => setEditingQtys((p) => ({ ...p, [oi.id]: 0 }))}
                                  className="text-xs text-red-400 hover:text-red-600 transition-colors font-bold leading-none"
                                  title="הסר פריט"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => void handleSaveOrderEdit(order.id, order.items)}
                              className="text-xs bg-chocolate text-cream px-3 py-1.5 rounded-lg font-semibold hover:bg-chocolate-light transition-colors"
                            >
                              שמור
                            </button>
                            <button
                              onClick={() => setEditingOrderId(null)}
                              className="text-xs bg-parchment border border-caramel-200 text-chocolate px-3 py-1.5 rounded-lg font-semibold hover:bg-caramel-100 transition-colors"
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {ordersView === "by-product" && (
            <div className="space-y-3">
              {menuItems.length === 0 && (
                <p className="text-center text-caramel-400 text-sm py-8">אין פריטים בתפריט</p>
              )}
              {menuItems.map((item) => {
                const ordered = productStats.orderedQty[item.id] ?? 0;
                const remaining = item.quantity_available - ordered;
                const buyers = productStats.buyers[item.id] ?? [];
                return (
                  <div key={item.id} className="bg-white border border-caramel-100 rounded-2xl shadow-card p-3 text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-chocolate">{item.product_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${remaining <= 0 ? "bg-red-100 text-red-600" : remaining <= 3 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        נשארו {remaining} / {item.quantity_available}
                      </span>
                    </div>
                    {buyers.length > 0 ? (
                      <div className="space-y-0.5">
                        {buyers.map((b, i) => (
                          <div key={i} className="text-xs text-caramel-600 flex items-center gap-1">
                            <span className="text-caramel-300">·</span>
                            <span>{b.customerName}</span>
                            <span className="text-caramel-400">×{b.qty}</span>
                            {b.withIceCream > 0 && b.withIceCream < b.qty && (
                              <span className="text-caramel-400">({b.withIceCream} עם גלידה)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-caramel-400">אין הזמנות</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StartSurveyPanelProps {
  event: EventOut;
  products: ProductOut[];
  onDone: (e: EventOut) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

function StartSurveyPanel({ event, products, onDone, onCancel, onError }: StartSurveyPanelProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 16);

  const [endsAt, setEndsAt] = useState(defaultDate);
  const [menuSize, setMenuSize] = useState("3");
  const [fixedIds, setFixedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleFixed = (id: string) => {
    setFixedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await adminStartSurvey(event.id, {
        survey_ends_at: new Date(endsAt).toISOString(),
        menu_size: parseInt(menuSize),
        fixed_product_ids: fixedIds,
      });
      onDone(result);
    } catch (err: unknown) {
      onError(toApiError(err).message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}
      className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-5 text-sm space-y-4">
      <h3 className="font-display font-bold text-purple-800">הגדרת סקר</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-purple-700 mb-1">סקר פעיל עד</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
            className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-purple-700 mb-1">כמות מנות מהסקר</label>
          <input
            type="number"
            min="1"
            value={menuSize}
            onChange={(e) => setMenuSize(e.target.value)}
            required
            className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-purple-700 mb-2">מנות קבועות (לא יופיעו בסקר)</p>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {products.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fixedIds.includes(p.id)}
                onChange={() => toggleFixed(p.id)}
                className="accent-purple-600"
              />
              <span className="text-chocolate">{p.name}</span>
              <span className="text-caramel-400 text-xs">{ICE_CREAM_MODE_LABELS[p.ice_cream_mode]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="bg-purple-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
          {saving ? "פותח סקר..." : "פתח סקר"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="bg-white border border-purple-200 text-purple-700 px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors">
          ביטול
        </button>
      </div>
    </form>
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
