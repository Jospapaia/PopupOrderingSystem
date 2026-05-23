const BUSINESS_TZ = import.meta.env.VITE_BUSINESS_TZ ?? "Asia/Jerusalem";

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("he-IL", { timeZone: BUSINESS_TZ });
}

export function formatDayOfWeek(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("he-IL", { weekday: "long", timeZone: BUSINESS_TZ });
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}
