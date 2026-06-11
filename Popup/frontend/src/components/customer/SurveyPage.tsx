import { useEffect, useState } from "react";
import type { SurveyPublicOut, SurveyProduct } from "../../api/types";
import { getSurvey, submitVote, toApiError, BASE } from "../../api/client";
import { formatDate } from "../../utils/format";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [voterName, setVoterName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
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
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p className="text-caramel-500">טוען...</p>
      </div>
    );
  }

  if (submitted || alreadyVoted) {
    return (
      <div className="min-h-screen bg-parchment flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🍦</div>
        <h1 className="font-display font-bold text-2xl text-chocolate mb-2">
          {submitted ? "ההצבעה נרשמה!" : "כבר הצבעת!"}
        </h1>
        <p className="text-caramel-600">תודה — ההצבעה שלך תשפיע על תפריט האירוע.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-parchment flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-caramel-600">{error === "הסקר הסתיים" ? "הסקר הסתיים" : "הסקר לא זמין"}</p>
      </div>
    );
  }

  if (!survey) return null;

  const endsAt = new Date(survey.survey_ends_at);

  return (
    <div className="min-h-screen bg-parchment" dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl text-chocolate">{survey.title}</h1>
          <p className="text-caramel-500 text-sm mt-1">{formatDate(survey.date)}</p>
          {survey.description && (
            <p className="text-caramel-600 text-sm mt-3 leading-relaxed">{survey.description}</p>
          )}
          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3">
            <p className="text-purple-700 font-medium text-sm">
              בחר עד {survey.menu_size} מנות שתרצה לראות בתפריט
            </p>
            <p className="text-purple-500 text-xs mt-1">
              הסקר פעיל עד {endsAt.toLocaleString("he-IL")}
            </p>
          </div>
        </div>

        {/* Name input */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-chocolate mb-1.5">השם שלך</label>
          <input
            type="text"
            placeholder="הכנס את שמך"
            value={voterName}
            onChange={(e) => setVoterName(e.target.value)}
            maxLength={100}
            className="w-full bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300"
          />
        </div>

        {/* Products */}
        <div className="space-y-2 mb-6">
          {survey.products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              selected={selected.has(p.id)}
              disabled={!selected.has(p.id) && selected.size >= survey.menu_size}
              onToggle={() => toggleProduct(p.id)}
            />
          ))}
        </div>

        {/* Counter + Submit */}
        <div className="sticky bottom-4">
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting || selected.size === 0 || !voterName.trim()}
            className="w-full bg-chocolate text-cream py-3 rounded-2xl font-semibold text-sm hover:bg-chocolate-light transition-colors disabled:opacity-50 shadow-lg"
          >
            {submitting
              ? "שולח..."
              : selected.size === 0
              ? "בחר לפחות מנה אחת"
              : `הצבע על ${selected.size} מנות`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: SurveyProduct;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function ProductCard({ product, selected, disabled, onToggle }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`w-full text-right bg-white border-2 rounded-2xl p-3 transition-all text-sm flex items-center gap-3
        ${selected
          ? "border-chocolate bg-chocolate/5 shadow-md"
          : disabled
          ? "border-caramel-100 opacity-40 cursor-not-allowed"
          : "border-caramel-100 hover:border-caramel-300"
        }`}
    >
      {product.image_url ? (
        <img
          src={`${BASE}${product.image_url}`}
          alt={product.name}
          className="w-14 h-14 object-cover rounded-xl shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-caramel-100 flex items-center justify-center shrink-0 text-2xl">
          🍦
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-chocolate">{product.name}</div>
        {product.description && (
          <div className="text-xs text-caramel-500 mt-0.5 line-clamp-2">{product.description}</div>
        )}
      </div>
      <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
        selected ? "border-chocolate bg-chocolate" : "border-caramel-300"
      }`}>
        {selected && <span className="text-cream text-xs font-bold">✓</span>}
      </div>
    </button>
  );
}
