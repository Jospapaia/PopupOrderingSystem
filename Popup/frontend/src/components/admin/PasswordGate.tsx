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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-6 text-center">כניסה לניהול</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">סיסמת מנהל</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="הכנס סיסמה"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "בודק..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}
