import type { MenuItemPublic, CartItem } from "../../api/types";
import { cartTotal, cartItemQuantity } from "../../utils/cart";

interface Props {
  menuItems: MenuItemPublic[];
  cart: CartItem[];
  onChange: (cart: CartItem[]) => void;
  onNext: () => void;
  baseUrl: string;
}

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #fde8d0 0%, #e8b87a 100%)",
  "linear-gradient(135deg, #fde0dc 0%, #e8a098 100%)",
  "linear-gradient(135deg, #e8f2d8 0%, #b8d898 100%)",
  "linear-gradient(135deg, #fdf0d0 0%, #e8c868 100%)",
  "linear-gradient(135deg, #e8e0f4 0%, #c0b0d8 100%)",
];

const PLACEHOLDER_ICONS = ["🍨", "🍦", "🍰", "🧁", "🍮"];

export default function ItemList({ menuItems, cart, onChange, onNext, baseUrl }: Props) {
  const getCartItem = (item: MenuItemPublic): CartItem =>
    cart.find((ci) => ci.menuItem.id === item.id) ??
    { menuItem: item, quantityWithIceCream: 0, quantityWithoutIceCream: 0 };

  const updateCart = (item: MenuItemPublic, updates: Partial<CartItem>) => {
    const existing = cart.findIndex((ci) => ci.menuItem.id === item.id);
    const updated  = { ...getCartItem(item), ...updates };
    if (existing >= 0) onChange(cart.map((ci, i) => (i === existing ? updated : ci)));
    else onChange([...cart, updated]);
  };

  // Total stepper: adds/removes a unit (without ice cream by default)
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

  // Ice cream sub-stepper: transfers between without ↔ with
  const incIceCream = (item: MenuItemPublic) => {
    const ci = getCartItem(item);
    updateCart(item, {
      quantityWithIceCream: ci.quantityWithIceCream + 1,
      quantityWithoutIceCream: ci.quantityWithoutIceCream - 1,
    });
  };
  const decIceCream = (item: MenuItemPublic) => {
    const ci = getCartItem(item);
    updateCart(item, {
      quantityWithIceCream: ci.quantityWithIceCream - 1,
      quantityWithoutIceCream: ci.quantityWithoutIceCream + 1,
    });
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
          const simpleQty    = item.ice_cream_mode === "included" ? ci.quantityWithIceCream : ci.quantityWithoutIceCream;

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
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-display font-bold text-[1.15rem] text-chocolate leading-tight">
                    {item.product_name}
                  </span>
                  <span className="font-bold text-caramel-500 text-lg mr-2 shrink-0">
                    ₪{item.price.toFixed(0)}
                  </span>
                </div>

                {isOutOfStock ? (
                  <p className="text-center text-sm text-caramel-400 py-1 tracking-wide">אזל מהמלאי</p>

                ) : !inCart ? (
                  /* ── Add button ── */
                  <button
                    onClick={() => isOptional
                      ? updateCart(item, { quantityWithoutIceCream: 1 })
                      : incSimple(item)
                    }
                    className="relative w-full overflow-hidden bg-chocolate text-cream font-semibold py-2.5 rounded-2xl text-base transition-all duration-200 active:scale-[0.97] hover:bg-chocolate-light"
                  >
                    <span className="relative z-10">הוספה להזמנה</span>
                    <span className="absolute inset-0 bg-gradient-to-l from-transparent via-white/10 to-transparent animate-shimmer" />
                  </button>

                ) : isOptional ? (
                  /* ── Optional: total stepper + ice cream sub-stepper ── */
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
                    {/* Ice cream sub-stepper */}
                    <div className="flex items-center justify-between bg-caramel-50 rounded-2xl px-3 py-2">
                      <span className="text-sm font-medium text-chocolate">
                        עם גלידה 🍦
                        {item.ice_cream_addon_price ? (
                          <span className="text-caramel-500 font-normal"> +₪{item.ice_cream_addon_price.toFixed(0)}</span>
                        ) : null}
                      </span>
                      <Stepper
                        value={ci.quantityWithIceCream}
                        onDec={() => decIceCream(item)}
                        onInc={() => incIceCream(item)}
                        disableInc={ci.quantityWithoutIceCream === 0}
                      />
                    </div>
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
  value, onDec, onInc, disableInc, large = false,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  disableInc: boolean;
  large?: boolean;
}) {
  const btnCls = large
    ? "w-11 h-11 rounded-2xl text-xl font-bold flex items-center justify-center transition-colors active:scale-90"
    : "w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-colors active:scale-90";

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={onDec} disabled={value === 0}
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
