import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ProductOut, IceCreamMode } from "../../api/types";
import {
  adminListProducts, adminCreateProduct, adminUpdateProduct,
  adminUploadProductImage, adminDeleteProduct, toApiError,
} from "../../api/client";
import { ICE_CREAM_MODES, ICE_CREAM_MODE_LABELS } from "../../utils/eventStatus";

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">ניהול מוצרים</h2>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="text-sm bg-pink-500 text-white px-3 py-1 rounded"
        >
          + מוצר חדש
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">
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
            <div key={p.id} className="bg-white border rounded-xl p-3 flex justify-between items-center text-sm">
              <div className="flex items-center gap-3 min-w-0">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded" />
                )}
                <div className="min-w-0">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-400 text-xs mr-2">{ICE_CREAM_MODE_LABELS[p.ice_cream_mode]}</span>
                  {p.description && <span className="text-gray-500 text-xs mr-2 truncate">{p.description}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(p.id)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  עריכה
                </button>
                <button
                  onClick={() => void handleDelete(p.id, p.name)}
                  className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                >
                  מחק
                </button>
              </div>
            </div>
          )
        )}
        {products.length === 0 && !showCreate && (
          <p className="text-gray-400 text-sm text-center py-4">אין מוצרים</p>
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const p = await adminCreateProduct({ name, description: description || undefined, ice_cream_mode: mode });
      onDone(p);
    } catch (err: unknown) {
      onError(toApiError(err).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-3 text-sm space-y-2">
      <h3 className="font-semibold">מוצר חדש</h3>
      <input
        placeholder="שם המוצר"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border rounded px-2 py-1"
      />
      <input
        placeholder="תיאור (אופציונלי)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded px-2 py-1"
      />
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (ICE_CREAM_MODES.includes(v as IceCreamMode)) setMode(v as IceCreamMode);
        }}
        className="w-full border rounded px-2 py-1"
      >
        {ICE_CREAM_MODES.map((m) => (
          <option key={m} value={m}>{ICE_CREAM_MODE_LABELS[m]}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button type="submit" className="bg-pink-500 text-white px-3 py-1 rounded text-sm">צור</button>
        <button type="button" onClick={onCancel} className="border px-3 py-1 rounded text-sm">ביטול</button>
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
    <form onSubmit={handleSave} className="bg-white border border-pink-200 rounded-xl p-3 text-sm space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border rounded px-2 py-1"
      />
      <input
        placeholder="תיאור"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded px-2 py-1"
      />
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (ICE_CREAM_MODES.includes(v as IceCreamMode)) setMode(v as IceCreamMode);
        }}
        className="w-full border rounded px-2 py-1"
      >
        {ICE_CREAM_MODES.map((m) => (
          <option key={m} value={m}>{ICE_CREAM_MODE_LABELS[m]}</option>
        ))}
      </select>
      <div className="flex gap-2 items-center">
        <button type="submit" className="bg-pink-500 text-white px-3 py-1 rounded text-sm">שמור</button>
        <button type="button" onClick={onCancel} className="border px-3 py-1 rounded text-sm">ביטול</button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="border px-3 py-1 rounded text-sm text-gray-600 disabled:opacity-50"
        >
          {uploading ? "מעלה..." : "תמונה"}
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
