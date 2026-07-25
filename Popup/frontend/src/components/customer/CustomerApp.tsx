import { useEffect, useState } from "react";
import { getUpcomingEvent, getAbout } from "../../api/client";
import type { UpcomingEvent, AboutPageOut } from "../../api/types";
import EventPage from "./EventPage";

export default function CustomerApp() {
  const [event, setEvent]           = useState<UpcomingEvent | null | undefined>(undefined);
  const [networkError, setNetworkError] = useState(false);
  const [errorDetail, setErrorDetail]   = useState<string>("");
  const [about, setAbout]           = useState<AboutPageOut | null>(null);

  const load = () => {
    setNetworkError(false);
    getUpcomingEvent()
      .then((res) => {
        if (res.survey_event_id) {
          window.location.replace(`/survey/${res.survey_event_id}`);
          return;
        }
        setEvent(res.event);
      })
      .catch((e) => {
        setErrorDetail((e as Error)?.message || String(e));
        setNetworkError(true);
      });
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { getAbout().then(setAbout).catch(() => {}); }, []);

  if (networkError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" dir="rtl">
        <div className="text-center max-w-xs animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-caramel-100 flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
          <p className="font-display font-bold text-xl text-chocolate mb-2">המערכת לא זמינה</p>
          <p className="text-caramel-500 text-sm mb-6">אנא נסה שוב בעוד מספר רגעים</p>
          {errorDetail && (
            <p className="text-[11px] text-caramel-400 mb-4 break-all font-mono" dir="ltr">{errorDetail}</p>
          )}
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
          <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-white shadow-sm">
            <img src="/logo.png" alt="לוגו" className="w-full h-full object-contain p-1.5" />
          </div>

          {/* Links: about + contact */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {about?.bio_text && (
              <a
                href="/about"
                className="text-xs text-caramel-600 hover:text-chocolate transition-colors border border-caramel-300 hover:border-caramel-500 rounded-full px-3 py-1"
              >
                קצת עלי ›
              </a>
            )}
            <a
              href="https://chat.whatsapp.com/JXqzvicAdq3FFij9VG1HZr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-caramel-600 hover:text-chocolate transition-colors border border-caramel-300 hover:border-caramel-500 rounded-full px-3 py-1"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              לעידכונים 🍪
            </a>
          </div>

          <h2 className="font-display font-bold text-2xl text-chocolate">אין אירוע קרוב</h2>
        </div>
      </div>
    );
  }

  return <EventPage event={event} />;
}
