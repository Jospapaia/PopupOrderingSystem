import { useState, type FormEvent } from "react";
import { adminListEvents, setAdminPasswordTransient, setAdminPassword, clearAdminAuth, toApiError } from "../../api/client";

interface Props {
  onSuccess: () => void;
}

export default function PasswordGate({ onSuccess }: Props) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setAdminPasswordTransient(pw);
    try {
      await adminListEvents();
      setAdminPassword(pw);
      onSuccess();
    } catch (err: unknown) {
      const e = toApiError(err);
      if (e.message === "UNAUTHORIZED") {
        setError("סיסמה שגויה — נסה שוב");
      } else {
        setError("שגיאת חיבור — ודא שהשרת פעיל");
      }
      clearAdminAuth();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-chocolate flex items-center justify-center shadow-button-lg">
            <span className="text-gold text-2xl">🍦</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-chocolate">ממשק ניהול</h1>
          <p className="text-caramel-500 text-sm mt-1">הכנס סיסמת מנהל כדי להמשיך</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-chocolate mb-1.5">
                סיסמת מנהל
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                autoFocus
                placeholder="הכנס סיסמה"
                className="
                  w-full bg-white border-2 border-caramel-200 focus:border-caramel-500
                  rounded-2xl px-4 py-3 text-base text-chocolate outline-none
                  transition-colors placeholder:text-caramel-300
                "
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full bg-chocolate text-cream py-3 rounded-2xl
                font-bold text-base shadow-button-lg transition-all duration-150
                active:scale-[0.98] disabled:opacity-40 hover:bg-chocolate-light
              "
            >
              <span className="font-display">{loading ? "בודק..." : "כניסה"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
