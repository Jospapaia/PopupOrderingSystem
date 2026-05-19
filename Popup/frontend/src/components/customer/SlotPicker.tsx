import type { SlotPublic } from "../../api/types";
import { formatTime } from "../../utils/format";

interface Props {
  slots: SlotPublic[];
  extraFullSlots: Set<string>;
  selectedSlotId: string | null;
  iceCreamPortions: number;
  onSelect: (slotId: string) => void;
  onBack: () => void;
}

export default function SlotPicker({ slots, extraFullSlots, selectedSlotId, iceCreamPortions, onSelect, onBack }: Props) {
  const now = new Date();

  return (
    <div className="pt-3 animate-fade-in">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-caramel-600 text-sm font-medium mb-5 hover:text-caramel-700 transition-colors"
      >
        <span className="text-base leading-none">›</span>
        <span>חזרה לתפריט</span>
      </button>

      {/* Heading */}
      <div className="mb-5">
        <h2 className="font-display font-bold text-2xl text-chocolate">שעת איסוף</h2>
        <p className="text-caramel-500 text-sm mt-0.5">בחירת שעה</p>
      </div>

      {/* Slot grid */}
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot, idx) => {
          const isFull     = extraFullSlots.has(slot.id) ||
                             (slot.booked_portions + iceCreamPortions > slot.max_ice_cream_effective);
          const isPast     = new Date(slot.slot_start) < now;
          const isDisabled = isFull || isPast;
          const isSelected = slot.id === selectedSlotId;

          return (
            <button
              key={slot.id}
              disabled={isDisabled}
              onClick={() => onSelect(slot.id)}
              style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              className={`
                relative rounded-3xl p-4 text-center transition-all duration-200 animate-slide-up
                ${isDisabled
                  ? "bg-caramel-50 text-caramel-300 cursor-not-allowed"
                  : isSelected
                  ? "bg-chocolate text-cream shadow-button-lg scale-[1.03]"
                  : "bg-white text-chocolate shadow-card hover:shadow-card-hover hover:scale-[1.02] active:scale-100"}
              `}
            >
              {/* Time */}
              <div className={`font-display font-bold text-[1.6rem] leading-none mb-1.5 ${isSelected ? "text-gold" : ""}`}>
                {formatTime(slot.slot_start)}
              </div>

              {isPast && !isFull && <div className="text-xs font-medium">עבר</div>}

              {!isPast && (
                <div className="mt-2.5 space-y-1">
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSelected ? "bg-white/20" : "bg-caramel-100"}`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        slot.booked_portions >= slot.max_ice_cream_effective
                          ? "bg-red-400"
                          : slot.booked_portions / slot.max_ice_cream_effective >= 0.75
                          ? isSelected ? "bg-amber-300" : "bg-amber-400"
                          : isSelected ? "bg-green-300" : "bg-green-400"
                      }`}
                      style={{ width: `${Math.min(100, (slot.booked_portions / slot.max_ice_cream_effective) * 100)}%` }}
                    />
                  </div>
                  <p className={`text-[10px] font-medium tabular-nums ${isSelected ? "text-cream/70" : "text-caramel-400"}`}>
                    {slot.max_ice_cream_effective - slot.booked_portions} מנות גלידה פנויות
                  </p>
                </div>
              )}

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                  <span className="text-chocolate text-[10px] font-black">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
