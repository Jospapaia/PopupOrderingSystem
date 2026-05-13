import type { SlotPublic } from "../../api/types";
import { formatTime } from "../../utils/format";

interface Props {
  slots: SlotPublic[];
  extraFullSlots: Set<string>;
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
  onBack: () => void;
}

export default function SlotPicker({ slots, extraFullSlots, selectedSlotId, onSelect, onBack }: Props) {
  const now = new Date();

  return (
    <div className="pt-2">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-warm-600 text-sm font-medium mb-5 hover:text-warm-700"
      >
        <span className="text-lg">›</span>
        <span>חזור לתפריט</span>
      </button>

      <h2 className="text-xl font-bold text-stone-800 mb-1">מתי תגיע?</h2>
      <p className="text-stone-500 text-sm mb-5">בחר שעת איסוף</p>

      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) => {
          const isFull = slot.is_full || extraFullSlots.has(slot.id);
          const isPast = new Date(slot.slot_start) < now;
          const isDisabled = isFull || isPast;
          const isSelected = slot.id === selectedSlotId;

          return (
            <button
              key={slot.id}
              disabled={isDisabled}
              onClick={() => onSelect(slot.id)}
              className={`
                relative rounded-3xl p-4 text-center transition-all
                ${isDisabled
                  ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                  : isSelected
                  ? "bg-warm-500 text-white shadow-md scale-[1.02]"
                  : "bg-white text-stone-700 shadow-card hover:shadow-card-hover hover:scale-[1.01] active:scale-100"
                }
              `}
            >
              <div className="text-2xl font-bold mb-1">{formatTime(slot.slot_start)}</div>
              {isFull && <div className="text-xs font-medium text-red-400">מלא</div>}
              {isPast && !isFull && <div className="text-xs font-medium">עבר</div>}
              {!isDisabled && (
                <div className={`text-xs mt-1 ${isSelected ? "text-warm-100" : "text-stone-400"}`}>
                  {slot.booked_portions}/{slot.max_ice_cream_effective} מנות
                </div>
              )}
              {isSelected && (
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <span className="text-warm-500 text-xs font-bold">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
