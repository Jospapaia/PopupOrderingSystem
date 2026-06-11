import { useEffect, useState } from "react";
import type { SurveyPublicOut, AboutPageOut } from "../../api/types";
import { getSurvey, submitVote, getAbout, toApiError, BASE } from "../../api/client";
import { formatDate, formatDayOfWeek, formatTimeRange } from "../../utils/format";

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #fde8d0 0%, #e8b87a 100%)",
  "linear-gradient(135deg, #fde0dc 0%, #e8a098 100%)",
  "linear-gradient(135deg, #e8f2d8 0%, #b8d898 100%)",
  "linear-gradient(135deg, #fdf0d0 0%, #e8c868 100%)",
  "linear-gradient(135deg, #e8e0f4 0%, #c0b0d8 100%)",
];
const PLACEHOLDER_ICONS = ["🍨", "🍦", "🍰", "🧁", "🍮"];

function getBrowserToken(eventId: string): string {
  const key = `survey_token_${eventId}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

function hasVoted(eventId: string): boolean {
  return localStorage.getItem(`survey_voted_${eventId}`) === "1";
}

function markVoted(eventId: string): void {
  localStorage.setItem(`survey_voted_${eventId}`, "1");
}

interface Props {
  eventId: string;
}

export default function SurveyPage({ eventId }: Props) {
  const [survey, setSurvey] = useState<SurveyPublicOut | null>(null);
  const [about, setAbout] = useState<AboutPageOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [voterName, setVoterName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    getAbout().then(setAbout).catch(() => {});
    if (hasVoted(eventId)) {
      setAlreadyVoted(true);
      setLoading(false);
      return;
    }
    getSurvey(eventId)
      .then((s) => { setSurvey(s); setLoading(false); })
      .catch((e: unknown) => {
        const err = toApiError(e);
        setError(err.message);
        setLoading(false);
      });
  }, [eventId]);

  const toggleProduct = (id: string) => {
    if (!survey) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < survey.menu_size) {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!survey || !voterName.trim() || selected.size === 0) return;
    setSubmitting(true);
    try {
      await submitVote(eventId, {
        voter_name: voterName.trim(),
        browser_token: getBrowserToken(eventId),
        product_ids: Array.from(selected),
      });
      markVoted(eventId);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(toApiError(e).message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-3" style={{ animation: "bounce 1s ease-in-out infinite" }}>🍦</div>
          <p className="text-caramel-400 text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (submitted || alreadyVoted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" dir="rtl">
        <div className="text-5xl mb-4">🍦</div>
        <h1 className="font-display font-bold text-2xl text-chocolate mb-2">
          {submitted ? "ההצבעה נרשמה!" : "כבר הצבעת!"}
        </h1>
        <p className="text-caramel-600">תודה — ההצבעה שלך תשפיע על תפריט האירוע.</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" dir="rtl">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-caramel-600">{error === "הסקר הסתיים" ? "הסקר הסתיים" : "הסקר לא זמין"}</p>
      </div>
    );
  }

  const endsAt = new Date(survey.survey_ends_at);

  return (
    <div className="min-h-screen" dir="rtl">

      {/* ── Header — identical to EventPage ─────────────────────────── */}
      <header className="relative bg-chocolate text-cream overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-caramel-700/30 blur-3xl" />
          <div className="absolute -bottom-4 left-8 w-32 h-32 rounded-full bg-gold/20 blur-2xl" />
        </div>

        <div className="relative z-10 text-center px-6 pt-8 pb-7">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden bg-white shadow-lg">
            <img src="/logo.png" alt="לוגו" className="w-full h-full object-contain p-1" />
          </div>

          <h1 className="font-display font-bold text-[2rem] leading-snug text-cream mb-1">
            {survey.title}
          </h1>

          <div className="flex items-center justify-center gap-2 my-2 opacity-50">
            <div className="h-px w-10 bg-gold" />
            <span className="text-gold text-xs">✦</span>
            <div className="h-px w-10 bg-gold" />
          </div>

          <p className="text-cream text-base font-semibold tracking-wide">
            {formatDayOfWeek(survey.date)}, {formatDate(survey.date)}
          </p>
          <p className="text-caramel-200 text-sm tracking-widest mt-0.5">
            {formatTimeRange(survey.end_time, survey.start_time)}
          </p>

          <div className="flex items-center justify-center gap-3 mt-3">
            {about?.bio_text && (
              <a
                href="/about"
                className="text-xs text-caramel-400 hover:text-cream transition-colors border border-caramel-600/40 hover:border-caramel-400 rounded-full px-3 py-1"
              >
                קצת עלי ›
              </a>
            )}
            <a
              href="https://chat.whatsapp.com/JXqzvicAdq3FFij9VG1HZr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-caramel-400 hover:text-cream transition-colors border border-caramel-600/40 hover:border-caramel-400 rounded-full px-3 py-1"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              לעידכונים 🍪
            </a>
          </div>
        </div>
      </header>

      {/* ── Description card — identical to EventPage ────────────────── */}
      {survey.description && (
        <div className="px-4 py-4 bg-parchment/50">
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-caramel-300/50" />
              <span className="text-gold text-[10px] tracking-widest opacity-70">✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-caramel-300/50" />
            </div>
            <div className="relative bg-white/80 border border-caramel-200/70 rounded-2xl px-5 py-4 text-center shadow-sm">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              <p className="text-sm text-caramel-700 leading-relaxed">
                {survey.description.split(/\n|<br\s*\/?>/i).map((part, i, arr) => (
                  <span key={i}>{part}{i < arr.length - 1 && <br />}</span>
                ))}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-caramel-300/50" />
              <span className="text-gold text-[10px] tracking-widest opacity-70">✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-caramel-300/50" />
            </div>
          </div>
        </div>
      )}

      {/* ── Survey intro ─────────────────────────────────────────────── */}
      <div className="max-w-md mx-auto px-4 pt-4 pb-2">
        <div className="bg-white/80 border border-caramel-200/70 rounded-2xl px-5 py-4 text-center shadow-sm">
          <p className="font-display font-bold text-chocolate text-base mb-0.5">
            עזרו לנו לבנות את התפריט
          </p>
          <p className="text-sm text-caramel-600">
            בחרו עד {survey.menu_size} מנות שתרצו לראות באירוע
          </p>
          <p className="text-xs text-caramel-400 mt-1">
            הסקר פעיל עד {endsAt.toLocaleString("he-IL")}
          </p>
        </div>
      </div>

      {/* ── Products ─────────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pb-36 pt-3">
        <div className="space-y-4">
          {survey.products.map((product, idx) => {
            const isSelected = selected.has(product.id);
            const isDisabled = !isSelected && selected.size >= survey.menu_size;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                disabled={isDisabled}
                className={`
                  w-full text-right relative bg-white rounded-3xl overflow-hidden transition-all duration-300
                  animate-slide-up
                  ${isSelected
                    ? "shadow-[0_4px_24px_rgba(200,118,42,0.18),0_1px_6px_rgba(42,20,0,0.08)] ring-2 ring-chocolate/40"
                    : isDisabled
                    ? "opacity-40 shadow-card cursor-not-allowed"
                    : "shadow-card hover:shadow-card-hover cursor-pointer"}
                `}
              >
                {/* Product image */}
                {product.image_url ? (
                  <img
                    src={`${BASE}${product.image_url}`}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-36 flex flex-col items-center justify-center gap-1"
                    style={{ background: PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length] }}
                  >
                    <span className="text-5xl drop-shadow-sm">{PLACEHOLDER_ICONS[idx % PLACEHOLDER_ICONS.length]}</span>
                  </div>
                )}

                <div className="p-4 pt-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-display font-bold text-[1.15rem] text-chocolate leading-tight block">
                        {product.name}
                      </span>
                      {product.description && (
                        <p className="text-xs text-caramel-500 leading-relaxed mt-1">{product.description}</p>
                      )}
                    </div>

                    {/* Selection indicator */}
                    <div className={`
                      w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all
                      ${isSelected ? "border-chocolate bg-chocolate" : "border-caramel-300 bg-white"}
                    `}>
                      {isSelected && <span className="text-cream text-sm font-bold">✓</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* ── Fixed bottom bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-50">
        <div className="bg-white/90 backdrop-blur-md border-t border-caramel-200 px-4 pt-3 pb-5 shadow-[0_-4px_24px_rgba(42,20,0,0.10)]">
          <div className="max-w-md mx-auto space-y-2">
            <input
              type="text"
              placeholder="השם שלך"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              maxLength={100}
              className="w-full bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-2xl px-4 py-2.5 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300"
            />
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || selected.size === 0 || !voterName.trim()}
              className="w-full bg-chocolate text-cream py-3 rounded-2xl font-bold text-base shadow-button-lg flex justify-between items-center px-5 transition-all duration-150 active:scale-[0.98] hover:bg-chocolate-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-display">
                {submitting ? "שולח..." : selected.size === 0 ? "בחר לפחות מנה אחת" : "הצבע"}
              </span>
              {selected.size > 0 && (
                <span className="text-gold font-bold">
                  {selected.size}/{survey.menu_size}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
