import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ProductOut, IceCreamMode } from "../../api/types";
import {
  adminListProducts, adminCreateProduct, adminUpdateProduct,
  adminUploadProductImage, adminDeleteProduct, toApiError, BASE,
} from "../../api/client";
import { ICE_CREAM_MODES, ICE_CREAM_MODE_LABELS } from "../../utils/eventStatus";

const inputCls =
  "w-full bg-white border-2 border-caramel-200 focus:border-caramel-500 rounded-xl px-3 py-2 text-sm text-chocolate outline-none transition-colors placeholder:text-caramel-300";

export default function ProductList() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () =>
    adminListProducts()
      .then(setProducts)
      .catch((e: unknown) => setError(toApiError(e).message));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`האם למחוק את המוצר "${name}"?`)) return;
    setError(null);
    try {
      await adminDeleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const e = toApiError(err);
      setError(e.status === 409 ? "לא ניתן למחוק — המוצר משויך לאירועים קיימים" : e.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display font-bold text-xl text-chocolate">ניהול מוצרים</h2>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="bg-chocolate text-cream px-4 py-2 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors shadow-button"
        >
          + מוצר חדש
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <CreateProductForm
          onDone={(p) => { setProducts((prev) => [...prev, p]); setShowCreate(false); }}
          onCancel={() => setShowCreate(false)}
          onError={setError}
        />
      )}

      <div className="space-y-2">
        {products.map((p) =>
          editingId === p.id ? (
            <EditProductRow
              key={p.id}
              product={p}
              onDone={(updated) => {
                setProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              onError={setError}
            />
          ) : (
            <div key={p.id}
              className="bg-white border border-caramel-100 rounded-2xl shadow-card p-3 flex justify-between items-center text-sm">
              <div className="flex items-center gap-3 min-w-0">
                {p.image_url ? (
                  <img
                    src={`${BASE}${p.image_url}`}
                    alt={p.name}
                    className="w-12 h-12 object-cover rounded-xl shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-caramel-100 flex items-center justify-center shrink-0">
                    <span className="text-xl">🍦</span>
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-semibold text-chocolate">{p.name}</span>
                  <span className="text-caramel-400 text-xs mr-2">{ICE_CREAM_MODE_LABELS[p.ice_cream_mode]}</span>
                  {p.description && (
                    <span className="text-caramel-500 text-xs mr-2 truncate block">{p.description}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setEditingId(p.id)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-parchment border border-caramel-200 text-chocolate hover:bg-caramel-100 transition-colors font-medium"
                >
                  עריכה
                </button>
                <button
                  onClick={() => void handleDelete(p.id, p.name)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-colors font-medium"
                >
                  מחק
                </button>
              </div>
            </div>
          )
        )}
        {products.length === 0 && !showCreate && (
          <div className="text-center py-12 text-caramel-400">
            <p className="text-4xl mb-3">🍨</p>
            <p className="font-medium">אין מוצרים עדיין</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CreateProductFormProps {
  onDone: (p: ProductOut) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

function CreateProductForm({ onDone, onCancel, onError }: CreateProductFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<IceCreamMode>("none");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let p = await adminCreateProduct({ name, description: description || undefined, ice_cream_mode: mode });
      if (imageFile) p = await adminUploadProductImage(p.id, imageFile);
      onDone(p);
    } catch (err: unknown) {
      onError(toApiError(err).message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}
      className="bg-white border border-caramel-100 rounded-2xl shadow-card p-4 mb-4 text-sm space-y-3">
      <h3 className="font-display font-bold text-chocolate">מוצר חדש</h3>
      <input
        placeholder="שם המוצר"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className={inputCls}
      />
      <input
        placeholder="תיאור (אופציונלי)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={inputCls}
      />
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (ICE_CREAM_MODES.includes(v as IceCreamMode)) setMode(v as IceCreamMode);
        }}
        className={inputCls}
      >
        {ICE_CREAM_MODES.map((m) => (
          <option key={m} value={m}>{ICE_CREAM_MODE_LABELS[m]}</option>
        ))}
      </select>
      <div className="flex gap-2 items-center flex-wrap">
        <button type="submit" disabled={loading}
          className="bg-chocolate text-cream px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors disabled:opacity-50">
          {loading ? "יוצר..." : "צור"}
        </button>
        <button type="button" onClick={onCancel} disabled={loading}
          className="bg-parchment border border-caramel-200 text-chocolate px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-100 transition-colors">
          ביטול
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
          className="bg-caramel-100 border border-caramel-200 text-caramel-600 px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-200 transition-colors disabled:opacity-50">
          {imageFile ? `📷 ${imageFile.name}` : "📷 תמונה"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </form>
  );
}

interface EditProductRowProps {
  product: ProductOut;
  onDone: (p: ProductOut) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

function EditProductRow({ product, onDone, onCancel, onError }: EditProductRowProps) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [mode, setMode] = useState<IceCreamMode>(product.ice_cream_mode);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updated = await adminUpdateProduct(product.id, {
        name,
        description: description || undefined,
        ice_cream_mode: mode,
      });
      onDone(updated);
    } catch (err: unknown) {
      onError(toApiError(err).message);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const updated = await adminUploadProductImage(product.id, file);
      onDone(updated);
    } catch (err: unknown) {
      onError(toApiError(err).message);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSave}
      className="bg-white border-2 border-caramel-200 rounded-2xl p-4 text-sm space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className={inputCls}
      />
      <input
        placeholder="תיאור"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={inputCls}
      />
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (ICE_CREAM_MODES.includes(v as IceCreamMode)) setMode(v as IceCreamMode);
        }}
        className={inputCls}
      >
        {ICE_CREAM_MODES.map((m) => (
          <option key={m} value={m}>{ICE_CREAM_MODE_LABELS[m]}</option>
        ))}
      </select>
      <div className="flex gap-2 items-center flex-wrap">
        <button type="submit"
          className="bg-chocolate text-cream px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-chocolate-light transition-colors">
          שמור
        </button>
        <button type="button" onClick={onCancel}
          className="bg-parchment border border-caramel-200 text-chocolate px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-100 transition-colors">
          ביטול
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-caramel-100 border border-caramel-200 text-caramel-600 px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-caramel-200 transition-colors disabled:opacity-50"
        >
          {uploading ? "מעלה..." : "📷 תמונה"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageUpload(file);
          }}
        />
      </div>
    </form>
  );
}
