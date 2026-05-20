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

      {/* Hero image — full-width, takes top of page */}
      {about?.image_url ? (
        <div className="relative w-full bg-parchment">
          <img
            src={`${BASE}${about.image_url}`}
            alt="תמונה"
            className="w-full h-auto block"
          />
          {/* gradient overlay so back button is readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          <a
            href="/"
            className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white/90 hover:bg-black/60 hover:text-white transition-colors text-2xl leading-none shadow-md"
          >
            ‹
          </a>
        </div>
      ) : (
        <header className="bg-chocolate text-cream px-5 py-4 flex items-center gap-3">
          <a href="/" className="text-caramel-300 hover:text-cream transition-colors text-lg leading-none">‹</a>
          <h1 className="font-display font-bold text-lg">קצת עלי</h1>
        </header>
      )}

      <main className="max-w-sm mx-auto px-5 py-7">
        <h1 className="font-display font-bold text-2xl text-chocolate mb-5">קצת עלי</h1>

        {about?.bio_text && (
          <div className="bg-white rounded-2xl px-5 py-5 shadow-card text-base text-caramel-700 leading-loose whitespace-pre-line">
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
