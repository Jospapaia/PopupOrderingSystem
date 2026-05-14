import { useEffect, useState } from "react";
import { getUpcomingEvent } from "../../api/client";
import type { UpcomingEvent } from "../../api/types";
import EventPage from "./EventPage";

export default function CustomerApp() {
  const [event, setEvent]           = useState<UpcomingEvent | null | undefined>(undefined);
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
      <div className="min-h-screen flex items-center justify-center p-5" dir="rtl">
        <div className="text-center max-w-xs animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-caramel-100 flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
          <p className="font-display font-bold text-xl text-chocolate mb-2">המערכת לא זמינה</p>
          <p className="text-caramel-500 text-sm mb-6">אנא נסה שוב בעוד מספר רגעים</p>
          <button
            onClick={load}
            className="bg-chocolate text-cream px-8 py-3 rounded-3xl font-bold shadow-button-lg hover:bg-chocolate-light transition-colors active:scale-95"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (event === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-3" style={{ animation: "bounce 1s ease-in-out infinite" }}>🍦</div>
          <p className="text-caramel-400 text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" dir="rtl">
        <div className="text-center max-w-xs animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-caramel-100 flex items-center justify-center">
            <span className="text-4xl">🍨</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-chocolate mb-2">אין אירוע קרוב</h2>
          <p className="text-caramel-500 text-sm">עקוב אחרינו לעדכונים על האירוע הבא</p>
        </div>
      </div>
    );
  }

  return <EventPage event={event} />;
}
