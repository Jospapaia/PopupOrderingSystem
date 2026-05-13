import { useEffect, useState, type FormEvent } from "react";
import { adminListEvents, adminCreateEvent, toApiError } from "../../api/client";
import type { EventOut } from "../../api/types";
import EventDetail from "./EventDetail";
import { STATUS_LABELS, STATUS_COLORS } from "../../utils/eventStatus";
import { formatDate, formatTimeRange } from "../../utils/format";

export default function EventList() {
  const [events, setEvents] = useState<EventOut[]>([]);
  const [selected, setSelected] = useState<EventOut | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", date: "", start_time: "", end_time: "",
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
      setForm({ title: "", date: "", start_time: "", end_time: "", slot_duration_min: 30, max_ice_cream_per_slot: 10 });
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">אירועים</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + אירוע חדש
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="bg-white border rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-3">יצירת אירוע חדש</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <label className="block mb-1">שם האירוע</label>
              <input className="w-full border rounded px-2 py-1" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="block mb-1">תאריך</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="block mb-1">שעת התחלה</label>
              <input type="time" className="w-full border rounded px-2 py-1" value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="block mb-1">שעת סיום</label>
              <input type="time" className="w-full border rounded px-2 py-1" value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
            <div>
              <label className="block mb-1">משך סלוט (דקות)</label>
              <input type="number" min="1" className="w-full border rounded px-2 py-1" value={form.slot_duration_min}
                onChange={(e) => setForm({ ...form, slot_duration_min: e.target.valueAsNumber })} required />
            </div>
            <div className="col-span-2">
              <label className="block mb-1">מקסימום מנות גלידה לסלוט</label>
              <input type="number" min="1" className="w-full border rounded px-2 py-1" value={form.max_ice_cream_per_slot}
                onChange={(e) => setForm({ ...form, max_ice_cream_per_slot: e.target.valueAsNumber })} required />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-pink-500 text-white px-4 py-1 rounded font-medium">שמור</button>
              <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-1 rounded">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{ev.title}</div>
              <div className="text-sm text-gray-500">
                {formatDate(ev.date)} · {formatTimeRange(ev.start_time, ev.end_time)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ev.status]}`}>
                {STATUS_LABELS[ev.status]}
              </span>
              <button onClick={() => setSelected(ev)} className="text-sm text-blue-600 hover:underline">נהל</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
