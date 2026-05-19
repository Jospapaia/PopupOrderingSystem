import { useEffect, useState } from "react";
import { getAbout, BASE } from "../../api/client";
import type { AboutPageOut } from "../../api/types";

export default function AboutPage() {
  const [about, setAbout] = useState<AboutPageOut | null>(null);

  useEffect(() => {
    getAbout().then(setAbout).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-parchment" dir="rtl">
      <header className="bg-chocolate text-cream px-5 py-4 flex items-center gap-3">
        <a href="/" className="text-caramel-300 hover:text-cream transition-colors text-lg leading-none">‹</a>
        <h1 className="font-display font-bold text-lg">קצת עלי</h1>
      </header>

      <main className="max-w-sm mx-auto px-5 py-8">
        {about?.image_url && (
          <div className="mb-6 flex justify-center">
            <img
              src={`${BASE}${about.image_url}`}
              alt="תמונה"
              className="w-44 h-44 rounded-full object-cover shadow-lg border-4 border-white"
            />
          </div>
        )}

        {about?.bio_text && (
          <div className="bg-white rounded-2xl px-5 py-5 shadow-card text-sm text-caramel-700 leading-relaxed whitespace-pre-line">
            {about.bio_text}
          </div>
        )}

        {!about?.bio_text && !about?.image_url && (
          <p className="text-center text-caramel-400 text-sm mt-12">אין מידע להצגה</p>
        )}
      </main>
    </div>
  );
}
