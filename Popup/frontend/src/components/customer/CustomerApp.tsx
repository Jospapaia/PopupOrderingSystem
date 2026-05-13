import { useEffect, useState } from "react";
import { getUpcomingEvent } from "../../api/client";
import type { UpcomingEvent } from "../../api/types";
import EventPage from "./EventPage";

export default function CustomerApp() {
  const [event, setEvent] = useState<UpcomingEvent | null | undefined>(undefined);
  const [networkError, setNetworkError] = useState(false);

  const load = () => {
    setNetworkError(false);
    getUpcomingEvent()
      .then((res) => setEvent(res.event))
      .catch(() => setNetworkError(true));
  };

  useEffect(() => { load(); }, []);

  if (networkError) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-stone-700 font-medium mb-5">
            המערכת לא זמינה כרגע, אנא נסה שוב בעוד מספר רגעים
          </p>
          <button
            onClick={load}
            className="bg-warm-600 text-white px-8 py-3 rounded-3xl font-semibold shadow-md hover:bg-warm-700 transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🍦</div>
          <p className="text-stone-500 text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">🍨</div>
          <p className="text-stone-700 font-semibold text-lg mb-2">אין אירוע קרוב כרגע</p>
          <p className="text-stone-500 text-sm">עקוב אחרינו לעדכונים על האירוע הבא</p>
        </div>
      </div>
    );
  }

  return <EventPage event={event} />;
}
