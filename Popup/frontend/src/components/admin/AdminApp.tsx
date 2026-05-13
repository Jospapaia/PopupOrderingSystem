import { useEffect, useState } from "react";
import { registerUnauthorizedHandler, clearAdminAuth, hasStoredAdminSession } from "../../api/client";
import PasswordGate from "./PasswordGate";
import EventList from "./EventList";
import ProductList from "./ProductList";

type AdminView = "events" | "products";

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <div className="flex gap-3 items-center">
          <h1 className="font-bold text-lg">ניהול</h1>
          <button
            onClick={() => setView("events")}
            className={`text-sm px-3 py-1 rounded-full ${view === "events" ? "bg-pink-500 text-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            אירועים
          </button>
          <button
            onClick={() => setView("products")}
            className={`text-sm px-3 py-1 rounded-full ${view === "products" ? "bg-pink-500 text-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            מוצרים
          </button>
        </div>
        <button
          onClick={() => {
            clearAdminAuth();
            setAuthed(false);
          }}
          className="text-sm text-gray-500 hover:text-red-500"
        >
          התנתק
        </button>
      </header>
      <main className="max-w-4xl mx-auto p-4">
        {view === "events" ? <EventList /> : <ProductList />}
      </main>
    </div>
  );
}
