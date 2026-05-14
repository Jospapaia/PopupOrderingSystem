import { useEffect, useState, type FormEvent } from "react";
import { adminListEvents, adminCreateEvent, toApiError } from "../../api/client";
import type { EventOut } from "../../api/types";
import EventDetail from "./EventDetail";
import { STATUS_LABELS, STATUS_COLORS } from "../../utils/eventStatus";
import { formatDate, formatTimeRange } from "../../utils/format";

const inputCls =
  "w-full bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300";

export default function EventList() {
  const [events, setEvents] = useState<EventOut[]>([]);
  const [selected, setSelected] = useState<EventOut | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", date: "", start_time: "", end_time: "",
    slot_duration_min: 30, max_ice_cream_per_slot: 10,
  });

  const load = () =>
    adminListEvents().then(setEvents).catch((e: unknown) => setError(toApiError(e).message));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await adminCreateEvent({ ...form });
      setShowCreate(false);
      setForm({ title: "", description: "", date: "", start_time: "", end_time: "", slot_duration_min: 30, max_ice_cream_per_slot: 10 });
      load();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    }
  };

  if (selected) {
    return (
      <EventDetail
        event={selected}
        onBack={() => { setSelected(null); load(); }}
        onAction={load}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display font-bold text-xl text-chocolate">אירועים</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-chocolate text-cream px-4 py-2 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors shadow-button"
        >
          + אירוע חדש
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="bg-white border border-caramel-100 rounded-2xl shadow-card p-5 mb-5">
          <h3 className="font-display font-bold text-chocolate mb-4">יצירת אירוע חדש</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <label className="block font-semibold text-chocolate mb-1.5">שם האירוע</label>
              <input className={inputCls} value={form.title} placeholder="שם האירוע"
                onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-chocolate mb-1.5">תיאור קצר <span className="font-normal text-caramel-400">(יוצג ללקוחות)</span></label>
              <textarea className={`${inputCls} resize-none`} value={form.description} rows={2} placeholder="כמה מילים על הקונספט..."
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block font-semibold text-chocolate mb-1.5">תאריך</label>
              <input type="date" className={inputCls} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="block font-semibold text-chocolate mb-1.5">שעת התחלה</label>
              <input type="time" className={inputCls} value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="block font-semibold text-chocolate mb-1.5">שעת סיום</label>
              <input type="time" className={inputCls} value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
            <div>
              <label className="block font-semibold text-chocolate mb-1.5">משך סלוט (דקות)</label>
              <input type="number" min="1" className={inputCls} value={form.slot_duration_min}
                onChange={(e) => setForm({ ...form, slot_duration_min: e.target.valueAsNumber })} required />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-chocolate mb-1.5">מקסימום מנות גלידה לסלוט</label>
              <input type="number" min="1" className={inputCls} value={form.max_ice_cream_per_slot}
                onChange={(e) => setForm({ ...form, max_ice_cream_per_slot: e.target.valueAsNumber })} required />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit"
                className="bg-chocolate text-cream px-4 py-2 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors">
                שמור
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="bg-parchment border border-caramel-200 text-chocolate px-4 py-2 rounded-xl text-sm font-semibold hover:bg-caramel-100 transition-colors">
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id}
            className="bg-white border border-caramel-100 rounded-2xl shadow-card p-4 flex items-center justify-between hover:shadow-card-hover transition-shadow">
            <div>
              <div className="font-semibold text-chocolate">{ev.title}</div>
              <div className="text-sm text-caramel-500 mt-0.5">
                {formatDate(ev.date)} · {formatTimeRange(ev.start_time, ev.end_time)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[ev.status]}`}>
                {STATUS_LABELS[ev.status]}
              </span>
              <button onClick={() => setSelected(ev)}
                className="text-sm font-semibold text-caramel-600 hover:text-chocolate transition-colors">
                נהל ›
              </button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center py-12 text-caramel-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-medium">אין אירועים עדיין</p>
          </div>
        )}
      </div>
    </div>
  );
}
