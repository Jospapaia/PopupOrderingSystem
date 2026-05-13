import type { MenuItemPublic, CartItem } from "../../api/types";
import { cartTotal } from "../../utils/cart";

interface Props {
  menuItems: MenuItemPublic[];
  cart: CartItem[];
  onChange: (cart: CartItem[]) => void;
  onNext: () => void;
  baseUrl: string;
}

export default function ItemList({ menuItems, cart, onChange, onNext, baseUrl }: Props) {
  const getCartItem = (item: MenuItemPublic): CartItem =>
    cart.find((ci) => ci.menuItem.id === item.id) ?? {
      menuItem: item,
      quantity: 0,
      withIceCream: false,
    };

  const updateCart = (item: MenuItemPublic, updates: Partial<CartItem>) => {
    const existing = cart.findIndex((ci) => ci.menuItem.id === item.id);
    const current = getCartItem(item);
    const updated = { ...current, ...updates };
    if (existing >= 0) {
      onChange(cart.map((ci, i) => (i === existing ? updated : ci)));
    } else {
      onChange([...cart, updated]);
    }
  };

  const setQty = (item: MenuItemPublic, qty: number) =>
    updateCart(item, { quantity: Math.max(0, qty) });
  const toggleIceCream = (item: MenuItemPublic, val: boolean) =>
    updateCart(item, { withIceCream: val });

  const total = cartTotal(cart);
  const hasItems = cart.some((ci) => ci.quantity > 0);

  return (
    <div className="pt-2">
      <div className="space-y-4">
        {menuItems.map((item) => {
          const ci = getCartItem(item);
          const isOutOfStock = item.remaining_quantity === 0;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-3xl overflow-hidden shadow-card transition-shadow ${
                isOutOfStock ? "opacity-50" : "hover:shadow-card-hover"
              }`}
            >
              {/* Product image */}
              {item.image_url ? (
                <img
                  src={`${baseUrl}${item.image_url}`}
                  alt={item.product_name}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-warm-100 flex items-center justify-center">
                  <span className="text-5xl">🍨</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-lg text-stone-800">{item.product_name}</span>
                  <span className="font-bold text-warm-600 text-lg">₪{item.price.toFixed(0)}</span>
                </div>

                {isOutOfStock ? (
                  <p className="text-sm text-stone-400 text-center py-1">אזל מהמלאי</p>
                ) : (
                  <>
                    {/* Quantity control */}
                    {ci.quantity === 0 ? (
                      <button
                        onClick={() => setQty(item, 1)}
                        className="w-full bg-warm-500 hover:bg-warm-600 active:bg-warm-700 text-white font-semibold py-2.5 rounded-2xl transition-colors text-base"
                      >
                        הוסף להזמנה
                      </button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setQty(item, ci.quantity - 1)}
                          className="w-11 h-11 rounded-2xl bg-warm-100 hover:bg-warm-200 text-warm-700 text-xl font-bold flex items-center justify-center transition-colors"
                        >
                          −
                        </button>
                        <span className="text-xl font-bold text-stone-800 w-8 text-center">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => setQty(item, ci.quantity + 1)}
                          disabled={ci.quantity >= item.remaining_quantity}
                          className="w-11 h-11 rounded-2xl bg-warm-500 hover:bg-warm-600 disabled:bg-warm-200 text-white text-xl font-bold flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Ice cream toggle */}
                    {item.ice_cream_mode === "optional" && ci.quantity > 0 && (
                      <button
                        onClick={() => toggleIceCream(item, !ci.withIceCream)}
                        className={`mt-3 w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-colors text-sm font-medium ${
                          ci.withIceCream
                            ? "border-warm-400 bg-warm-50 text-warm-700"
                            : "border-stone-200 bg-stone-50 text-stone-500"
                        }`}
                      >
                        <span>🍦 הוסף גלידה</span>
                        <span className={ci.withIceCream ? "text-warm-600 font-bold" : "text-stone-400"}>
                          {ci.withIceCream ? "✓ " : ""}+₪{(item.ice_cream_addon_price ?? 0).toFixed(0)}
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky cart summary */}
      {hasItems && (
        <div className="sticky bottom-4 mt-6">
          <button
            onClick={onNext}
            className="w-full bg-warm-600 hover:bg-warm-700 active:bg-warm-800 text-white py-4 rounded-3xl font-bold text-lg shadow-lg flex justify-between items-center px-6 transition-colors"
          >
            <span>המשך להזמנה</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-base font-semibold">
              ₪{total.toFixed(0)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
