import { useEffect, useRef, useState } from "react";
import type { AboutPageOut } from "../../api/types";
import { adminGetAbout, adminUpdateAbout, adminUploadAboutImage, toApiError, BASE } from "../../api/client";

const inputCls =
  "w-full bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300";

export default function AboutEditor() {
  const [about, setAbout] = useState<AboutPageOut | null>(null);
  const [bioText, setBioText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminGetAbout()
      .then((data) => { setAbout(data); setBioText(data.bio_text ?? ""); })
      .catch((e: unknown) => setError(toApiError(e).message));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const updated = await adminUpdateAbout({ bio_text: bioText || null });
      setAbout(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async (file: File) => {
    setUploading(true); setError(null);
    try {
      const updated = await adminUploadAboutImage(file);
      setAbout(updated);
    } catch (e: unknown) {
      setError(toApiError(e).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 className="font-display font-bold text-xl text-chocolate mb-5">דף אודות</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white border border-caramel-100 rounded-2xl shadow-card p-5 space-y-4">
        {/* Current image */}
        <div className="flex items-center gap-4">
          {about?.image_url ? (
            <img
              src={`${BASE}${about.image_url}`}
              alt="תמונה"
              className="w-20 h-20 rounded-full object-cover border-2 border-caramel-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-caramel-100 flex items-center justify-center text-3xl shrink-0">
              👤
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-chocolate mb-1">תמונה</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs px-3 py-1.5 rounded-lg bg-caramel-100 border border-caramel-200 text-caramel-600 hover:bg-caramel-200 transition-colors disabled:opacity-50"
            >
              {uploading ? "מעלה..." : "העלאת תמונה"}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImage(f); }} />
          </div>
        </div>

        {/* Bio text */}
        <div>
          <label className="block text-xs font-semibold text-caramel-500 mb-1">טקסט חופשי</label>
          <textarea
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            rows={6}
            placeholder="ספר קצת על עצמך..."
            className={`${inputCls} resize-none`}
          />
          <p className="text-xs text-caramel-400 mt-1">Enter לשבירת שורה. ריק = הדף לא יופיע.</p>
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-chocolate text-cream px-4 py-2 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors disabled:opacity-50"
        >
          {saving ? "שומר..." : saved ? "נשמר ✓" : "שמור"}
        </button>
      </div>
    </div>
  );
}
