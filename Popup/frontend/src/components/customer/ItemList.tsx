import { useState } from "react";
import type { MenuItemPublic, CartItem } from "../../api/types";
import { cartTotal, cartItemQuantity } from "../../utils/cart";

interface Props {
  menuItems: MenuItemPublic[];
  cart: CartItem[];
  onChange: (cart: CartItem[]) => void;
  onNext: () => void;
  baseUrl: string;
  iceCreamTotalRemaining: number | null;
}

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #fde8d0 0%, #e8b87a 100%)",
  "linear-gradient(135deg, #fde0dc 0%, #e8a098 100%)",
  "linear-gradient(135deg, #e8f2d8 0%, #b8d898 100%)",
  "linear-gradient(135deg, #fdf0d0 0%, #e8c868 100%)",
  "linear-gradient(135deg, #e8e0f4 0%, #c0b0d8 100%)",
];

const PLACEHOLDER_ICONS = ["🍨", "🍦", "🍰", "🧁", "🍮"];

export default function ItemList({ menuItems, cart, onChange, onNext, baseUrl, iceCreamTotalRemaining }: Props) {
  const getCartItem = (item: MenuItemPublic): CartItem =>
    cart.find((ci) => ci.menuItem.id === item.id) ??
    { menuItem: item, quantityWithIceCream: 0, quantityWithoutIceCream: 0 };

  const updateCart = (item: MenuItemPublic, updates: Partial<CartItem>) => {
    const existing = cart.findIndex((ci) => ci.menuItem.id === item.id);
    const updated  = { ...getCartItem(item), ...updates };
    if (existing >= 0) onChange(cart.map((ci, i) => (i === existing ? updated : ci)));
    else onChange([...cart, updated]);
  };

  // In-cart total stepper for optional items: adds a without-ice-cream portion,
  // or removes a portion (without-ice-cream first, so ice cream portions survive).
  const incTotal = (item: MenuItemPublic) => {
    const ci = getCartItem(item);
    updateCart(item, { quantityWithoutIceCream: ci.quantityWithoutIceCream + 1 });
  };
  const decTotal = (item: MenuItemPublic) => {
    const ci = getCartItem(item);
    if (ci.quantityWithoutIceCream > 0) {
      updateCart(item, { quantityWithoutIceCream: ci.quantityWithoutIceCream - 1 });
    } else if (ci.quantityWithIceCream > 0) {
      updateCart(item, { quantityWithIceCream: ci.quantityWithIceCream - 1 });
    }
  };

  // Non-optional single stepper
  const incSimple = (item: MenuItemPublic) => {
    const ci = getCartItem(item);
    if (item.ice_cream_mode === "included") {
      updateCart(item, { quantityWithIceCream: ci.quantityWithIceCream + 1 });
    } else {
      updateCart(item, { quantityWithoutIceCream: ci.quantityWithoutIceCream + 1 });
    }
  };
  const decSimple = (item: MenuItemPublic) => {
    const ci = getCartItem(item);
    if (item.ice_cream_mode === "included") {
      updateCart(item, { quantityWithIceCream: Math.max(0, ci.quantityWithIceCream - 1) });
    } else {
      updateCart(item, { quantityWithoutIceCream: Math.max(0, ci.quantityWithoutIceCream - 1) });
    }
  };

  // Pre-add quantity chosen on the card for any product not yet in the cart.
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  const pendingFor = (item: MenuItemPublic) => pendingQty[item.id] ?? 1;
  const setPending = (item: MenuItemPublic, v: number) =>
    setPendingQty((prev) => ({ ...prev, [item.id]: v }));

  // Ice cream count dialog: opens on "add to order" (and on edit) for optional items.
  const [iceCreamDialog, setIceCreamDialog] =
    useState<{ item: MenuItemPublic; quantity: number; initialIce: number } | null>(null);

  const confirmIceCream = (iceCount: number) => {
    if (!iceCreamDialog) return;
    const { item, quantity } = iceCreamDialog;
    updateCart(item, {
      quantityWithIceCream: iceCount,
      quantityWithoutIceCream: quantity - iceCount,
    });
    setPending(item, 1);
    setIceCreamDialog(null);
  };

  // "Add to order" — chosen quantity enters the cart. Optional items route
  // through the ice cream dialog; included/none go straight in.
  const handleAdd = (item: MenuItemPublic) => {
    const qty = pendingFor(item);
    if (item.ice_cream_mode === "optional") {
      setIceCreamDialog({ item, quantity: qty, initialIce: 0 });
    } else if (item.ice_cream_mode === "included") {
      updateCart(item, { quantityWithIceCream: qty });
      setPending(item, 1);
    } else {
      updateCart(item, { quantityWithoutIceCream: qty });
      setPending(item, 1);
    }
  };

  const total     = cartTotal(cart);
  const hasItems  = cart.some((ci) => cartItemQuantity(ci) > 0);
  const cartCount = cart.reduce((n, ci) => n + cartItemQuantity(ci), 0);

  const staggerClass = ["stagger-1","stagger-2","stagger-3","stagger-4","stagger-5"];

  return (
    <div className={`pt-3 ${hasItems ? "pb-28" : ""}`}>
      <div className="space-y-4">
        {menuItems.map((item, idx) => {
          const ci           = getCartItem(item);
          const totalQty     = cartItemQuantity(ci);
          const isOutOfStock = item.remaining_quantity === 0;
          const inCart       = totalQty > 0;
          const isOptional   = item.ice_cream_mode === "optional";
          const isIncluded   = item.ice_cream_mode === "included";
          const simpleQty    = isIncluded ? ci.quantityWithIceCream : ci.quantityWithoutIceCream;
          const isLowStock   = item.remaining_quantity > 0 && item.remaining_quantity <= 5;
          const iceCreamExhausted = iceCreamTotalRemaining === 0;
          const iceCreamLow  = iceCreamTotalRemaining !== null && iceCreamTotalRemaining > 0 && iceCreamTotalRemaining <= 5;
          const hasIceCreamMode = item.ice_cream_mode !== "none";

          return (
            <div
              key={item.id}
              className={`
                relative bg-white rounded-3xl overflow-hidden transition-all duration-300
                animate-slide-up ${staggerClass[idx % 5]}
                ${isOutOfStock
                  ? "opacity-50"
                  : inCart
                  ? "shadow-[0_4px_24px_rgba(200,118,42,0.18),0_1px_6px_rgba(42,20,0,0.08)] ring-1 ring-caramel-300/60"
                  : "shadow-card hover:shadow-card-hover"}
              `}
            >
              {/* Product image / placeholder */}
              {item.image_url ? (
                <img
                  src={`${baseUrl}${item.image_url}`}
                  alt={item.product_name}
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
                {/* Name + price */}
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-display font-bold text-[1.15rem] text-chocolate leading-tight">
                    {item.product_name}
                  </span>
                  <span className="font-bold text-caramel-500 text-lg mr-2 shrink-0">
                    ₪{item.price.toFixed(0)}
                  </span>
                </div>

                {/* Product description */}
                {item.description && (
                  <p className="text-xs text-caramel-500 leading-relaxed mb-1.5">{item.description}</p>
                )}

                {/* Ice cream mode badge */}
                {isIncluded && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-caramel-600 bg-caramel-50 border border-caramel-200/70 rounded-full px-2 py-0.5 mb-1.5">
                    🍦 כולל גלידה
                  </span>
                )}
                {isOptional && item.ice_cream_addon_price ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-caramel-500 bg-caramel-50 border border-caramel-200/70 rounded-full px-2 py-0.5 mb-1.5">
                    תוספת גלידה ₪{item.ice_cream_addon_price.toFixed(0)}
                  </span>
                ) : isOptional ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-caramel-500 bg-caramel-50 border border-caramel-200/70 rounded-full px-2 py-0.5 mb-1.5">
                    תוספת גלידה
                  </span>
                ) : null}

                {/* Low stock badge */}
                {isLowStock && (
                  <p className="text-xs font-semibold text-orange-600 mb-2">
                    נשארו {item.remaining_quantity} מנות
                  </p>
                )}

                {/* Ice cream low stock badge (event-wide cap) */}
                {hasIceCreamMode && iceCreamLow && iceCreamTotalRemaining !== null && (
                  <p className="text-xs font-semibold text-orange-500 mb-2">
                    נשארו {iceCreamTotalRemaining} מנות גלידה
                  </p>
                )}

                {isOutOfStock ? (
                  <p className="text-center text-sm text-caramel-400 py-1 tracking-wide">אזל מהמלאי</p>

                ) : isIncluded && iceCreamExhausted && !inCart ? (
                  /* ── Included ice cream exhausted — can't add ── */
                  <p className="text-center text-sm text-caramel-400 py-1 tracking-wide">אין גלידה זמינה</p>

                ) : !inCart ? (
                  /* ── Not in cart: pick quantity + add, same row (all products) ── */
                  <div className="flex items-center gap-3">
                    <Stepper
                      value={pendingFor(item)}
                      onDec={() => setPending(item, Math.max(1, pendingFor(item) - 1))}
                      onInc={() => setPending(item, Math.min(item.remaining_quantity, pendingFor(item) + 1))}
                      disableDec={pendingFor(item) <= 1}
                      disableInc={pendingFor(item) >= item.remaining_quantity}
                      large
                    />
                    <button
                      onClick={() => handleAdd(item)}
                      className="relative flex-1 overflow-hidden bg-chocolate text-cream font-semibold py-2.5 rounded-2xl text-base transition-all duration-200 active:scale-[0.97] hover:bg-chocolate-light"
                    >
                      <span className="relative z-10">הוספה להזמנה</span>
                      <span className="absolute inset-0 bg-gradient-to-l from-transparent via-white/10 to-transparent animate-shimmer" />
                    </button>
                  </div>

                ) : isIncluded && iceCreamExhausted ? (
                  /* ── Included ice cream exhausted — in cart already, disable stepper ── */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Stepper
                        value={simpleQty}
                        onDec={() => decSimple(item)}
                        onInc={() => incSimple(item)}
                        disableInc={true}
                        large
                      />
                    </div>
                    <p className="text-xs text-center text-caramel-400">אין גלידה זמינה</p>
                  </div>

                ) : isOptional ? (
                  /* ── Optional: total stepper + ice cream summary (dialog-driven) ── */
                  <div className="space-y-2.5">
                    {/* Total quantity stepper */}
                    <div className="flex items-center justify-between gap-3">
                      <Stepper
                        value={totalQty}
                        onDec={() => decTotal(item)}
                        onInc={() => incTotal(item)}
                        disableInc={totalQty >= item.remaining_quantity}
                        large
                      />
                    </div>
                    {/* Ice cream summary — tap to change count */}
                    <button
                      onClick={() =>
                        setIceCreamDialog({ item, quantity: totalQty, initialIce: ci.quantityWithIceCream })
                      }
                      className="w-full flex items-center justify-between bg-caramel-50 rounded-2xl px-3 py-2 text-right transition-colors hover:bg-caramel-100"
                    >
                      <span className="text-sm font-medium text-chocolate">
                        {ci.quantityWithIceCream > 0
                          ? `${ci.quantityWithIceCream} עם גלידה 🍦`
                          : "הוספת גלידה 🍦"}
                        {item.ice_cream_addon_price ? (
                          <span className="text-caramel-500 font-normal"> +₪{item.ice_cream_addon_price.toFixed(0)}</span>
                        ) : null}
                      </span>
                      <span className="text-sm font-semibold text-caramel-600">שינוי ›</span>
                    </button>
                  </div>

                ) : (
                  /* ── Non-optional: single stepper ── */
                  <div className="flex items-center justify-between gap-3">
                    <Stepper
                      value={simpleQty}
                      onDec={() => decSimple(item)}
                      onInc={() => incSimple(item)}
                      disableInc={totalQty >= item.remaining_quantity}
                      large
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Ice cream count dialog ── */}
      {iceCreamDialog && (
        <IceCreamDialog
          item={iceCreamDialog.item}
          quantity={iceCreamDialog.quantity}
          initialIce={iceCreamDialog.initialIce}
          iceCreamExhausted={iceCreamTotalRemaining === 0}
          onConfirm={confirmIceCream}
          onClose={() => setIceCreamDialog(null)}
        />
      )}

      {/* ── Fixed bottom bar ── */}
      {hasItems && (
        <div className="fixed bottom-0 inset-x-0 z-50 animate-slide-up">
          <div className="bg-white/90 backdrop-blur-md border-t border-caramel-200 px-4 pt-3 pb-5 shadow-[0_-4px_24px_rgba(42,20,0,0.10)]">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div className="text-sm text-caramel-500 font-medium leading-tight">
                <span className="font-bold text-chocolate text-base">{cartCount}</span>
                {" "}{cartCount === 1 ? "פריט" : "פריטים"}
              </div>
              <button
                onClick={onNext}
                className="
                  flex-1 bg-chocolate text-cream py-3 rounded-2xl font-bold text-base
                  shadow-button-lg flex justify-between items-center px-5
                  transition-all duration-150 active:scale-[0.98] hover:bg-chocolate-light
                "
              >
                <span className="font-display">המשך להזמנה</span>
                <span className="text-gold font-bold">₪{total.toFixed(0)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({
  value, onDec, onInc, disableInc, disableDec, large = false,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  disableInc: boolean;
  disableDec?: boolean;
  large?: boolean;
}) {
  const btnCls = large
    ? "w-11 h-11 rounded-2xl text-xl font-bold flex items-center justify-center transition-colors active:scale-90"
    : "w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-colors active:scale-90";

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={onDec} disabled={disableDec ?? value === 0}
        className={`${btnCls} bg-caramel-100 hover:bg-caramel-200 disabled:opacity-40 text-chocolate`}>
        −
      </button>
      <span className={`font-display font-bold text-chocolate text-center ${large ? "text-2xl w-8" : "text-xl w-6"}`}>
        {value}
      </span>
      <button onClick={onInc} disabled={disableInc}
        className={`${btnCls} bg-chocolate hover:bg-chocolate-light disabled:bg-caramel-200 text-cream`}>
        +
      </button>
    </div>
  );
}

function IceCreamDialog({
  item, quantity, initialIce, iceCreamExhausted, onConfirm, onClose,
}: {
  item: MenuItemPublic;
  quantity: number;
  initialIce: number;
  iceCreamExhausted: boolean;
  onConfirm: (iceCount: number) => void;
  onClose: () => void;
}) {
  const [iceCount, setIceCount] = useState(
    iceCreamExhausted ? 0 : Math.min(initialIce, quantity)
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-xl p-6 max-w-xs w-full text-center space-y-4"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl">🍦</div>
        <h3 className="font-display font-bold text-chocolate text-lg">{item.product_name}</h3>
        <p className="text-caramel-600 text-sm leading-relaxed">
          כמה מתוך {quantity} המנות עם גלידה?
          {item.ice_cream_addon_price ? (
            <span className="block text-caramel-500 text-xs mt-1">
              תוספת ₪{item.ice_cream_addon_price.toFixed(0)} למנה
            </span>
          ) : null}
        </p>
        <div className="flex items-center justify-between bg-caramel-50 rounded-2xl px-4 py-3">
          <span className="text-sm font-medium text-chocolate">עם גלידה 🍦</span>
          <Stepper
            value={iceCount}
            onDec={() => setIceCount((n) => Math.max(0, n - 1))}
            onInc={() => setIceCount((n) => Math.min(quantity, n + 1))}
            disableInc={iceCount >= quantity || iceCreamExhausted}
          />
        </div>
        {iceCreamExhausted && (
          <p className="text-xs text-orange-500">אין גלידה זמינה</p>
        )}
        <button
          onClick={() => onConfirm(iceCount)}
          className="w-full py-2.5 rounded-2xl bg-chocolate text-cream font-semibold text-sm hover:bg-chocolate-light transition-colors"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
