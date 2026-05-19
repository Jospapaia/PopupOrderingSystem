import { useEffect, useState } from "react";
import { registerUnauthorizedHandler, clearAdminAuth, hasStoredAdminSession } from "../../api/client";
import PasswordGate from "./PasswordGate";
import EventList from "./EventList";
import ProductList from "./ProductList";
import AboutEditor from "./AboutEditor";

type AdminView = "events" | "products" | "about";

export default function AdminApp() {
  const [authed, setAuthed] = useState(hasStoredAdminSession());
  const [view, setView] = useState<AdminView>("events");

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearAdminAuth();
      setAuthed(false);
    });
  }, []);

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <header className="bg-chocolate px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-gold text-xl">🍦</span>
          <h1 className="font-display font-bold text-cream text-lg ml-2">ניהול</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setView("events")}
              className={`text-sm px-3 py-1.5 rounded-xl font-medium transition-colors ${
                view === "events"
                  ? "bg-gold text-chocolate"
                  : "text-caramel-300 hover:text-cream"
              }`}
            >
              אירועים
            </button>
            <button
              onClick={() => setView("products")}
              className={`text-sm px-3 py-1.5 rounded-xl font-medium transition-colors ${
                view === "products"
                  ? "bg-gold text-chocolate"
                  : "text-caramel-300 hover:text-cream"
              }`}
            >
              מוצרים
            </button>
            <button
              onClick={() => setView("about")}
              className={`text-sm px-3 py-1.5 rounded-xl font-medium transition-colors ${
                view === "about"
                  ? "bg-gold text-chocolate"
                  : "text-caramel-300 hover:text-cream"
              }`}
            >
              אודות
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            clearAdminAuth();
            setAuthed(false);
          }}
          className="text-xs text-caramel-400 hover:text-cream transition-colors"
        >
          התנתק
        </button>
      </header>
      <main className="max-w-4xl mx-auto p-4 py-6">
        {view === "events" ? <EventList /> : view === "products" ? <ProductList /> : <AboutEditor />}
      </main>
    </div>
  );
}
