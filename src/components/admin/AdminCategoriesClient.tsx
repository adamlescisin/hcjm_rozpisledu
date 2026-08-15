"use client";

import { useState } from "react";
import { EventCategory } from "@prisma/client";
import { Plus, Pencil, Trash2, Save, X, Loader2, GripVertical } from "lucide-react";

const PRESET_COLORS = [
  "#EAB308", // yellow - trénink hokej
  "#C8102E", // red - zápas
  "#3B82F6", // blue - trénink kraso
  "#22C55E", // green - veřejné bruslení
  "#8B5CF6", // purple
  "#F97316", // orange
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#6B7280", // gray - úprava ledu
];

interface Props {
  categories: EventCategory[];
}

const emptyForm = {
  name: "",
  color: PRESET_COLORS[0],
  icon: "",
  defaultDurationMinutes: 60,
  requiresResurfacingBefore: false,
  requiresResurfacingAfter: false,
  resurfacingBeforeMinutes: 15,
  resurfacingAfterMinutes: 15,
  isActive: true,
  sortOrder: 0,
};

export default function AdminCategoriesClient({ categories: initial }: Props) {
  const [categories, setCategories] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (id?: string) => {
    setLoading(true);
    setError(null);

    const url = id ? `/api/admin/categories/${id}` : "/api/admin/categories";
    const method = id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sortOrder: id ? form.sortOrder : categories.length }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Chyba");
      setLoading(false);
      return;
    }

    if (id) {
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      setEditId(null);
    } else {
      setCategories((prev) => [...prev, data]);
      setShowAdd(false);
      setForm(emptyForm);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat kategorii? Pokud má přiřazené události, nebude to možné.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const startEdit = (cat: EventCategory) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      color: cat.color,
      icon: cat.icon ?? "",
      defaultDurationMinutes: cat.defaultDurationMinutes,
      requiresIceResurfacingBefore: cat.requiresIceResurfacingBefore,
      requiresIceResurfacingAfter: cat.requiresIceResurfacingAfter,
      resurfacingDurationMinutes: cat.resurfacingDurationMinutes,
      resurfacingDurationMinutes: cat.resurfacingDurationMinutes,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Kategorie</h1>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Nová kategorie
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4">
          <CategoryForm
            form={form}
            setForm={setForm}
            onSave={() => handleSave()}
            onCancel={() => setShowAdd(false)}
            loading={loading}
            error={error}
          />
        </div>
      )}

      <div className="space-y-2">
        {categories.length === 0 && !showAdd && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Žádné kategorie. Vytvořte první!
          </div>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl border overflow-hidden">
            {editId === cat.id ? (
              <div className="p-4">
                <CategoryForm
                  form={form}
                  setForm={setForm}
                  onSave={() => handleSave(cat.id)}
                  onCancel={() => setEditId(null)}
                  loading={loading}
                  error={error}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{cat.name}</span>
                    {!cat.isActive && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">Neaktivní</span>
                    )}
                    {(cat.resurfacingDurationMinutes || cat.resurfacingDurationMinutes) && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">Úprava ledu</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {cat.defaultDurationMinutes} min
                    {cat.resurfacingDurationMinutes && ` · ${cat.resurfacingDurationMinutes} min před`}
                    {cat.resurfacingDurationMinutes && ` · ${cat.resurfacingDurationMinutes} min po`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormProps {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

function CategoryForm({ form, setForm, onSave, onCancel, loading, error }: FormProps) {
  const f = (key: keyof typeof emptyForm) => (
    value: string | number | boolean
  ) => setForm({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => f("name")(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Trénink hokej"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Výchozí délka (min)</label>
          <input
            type="number"
            value={form.defaultDurationMinutes}
            onChange={(e) => f("defaultDurationMinutes")(parseInt(e.target.value))}
            min={15} max={480} step={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Barva *</label>
        <div className="flex flex-wrap gap-2 items-center">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => f("color")(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                form.color === color ? "border-gray-900 scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={(e) => f("color")(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
            title="Vlastní barva"
          />
        </div>
      </div>

      {/* Ice resurfacing */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.requiresResurfacingBefore}
            onChange={(e) => f("requiresResurfacingBefore")(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          Úprava ledu před ({form.resurfacingBeforeMinutes} min)
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.requiresResurfacingAfter}
            onChange={(e) => f("requiresResurfacingAfter")(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          Úprava ledu po ({form.resurfacingAfterMinutes} min)
        </label>
        {form.requiresResurfacingBefore && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Délka před (min)</label>
            <input
              type="number"
              value={form.resurfacingBeforeMinutes}
              onChange={(e) => f("resurfacingBeforeMinutes")(parseInt(e.target.value))}
              min={5} max={60} step={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}
        {form.requiresResurfacingAfter && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Délka po (min)</label>
            <input
              type="number"
              value={form.resurfacingAfterMinutes}
              onChange={(e) => f("resurfacingAfterMinutes")(parseInt(e.target.value))}
              min={5} max={60} step={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => f("isActive")(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-primary)]"
        />
        Aktivní (zobrazuje se v rozpisu)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <X size={14} />
          Zrušit
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={loading || !form.name || !form.color}
          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Uložit
        </button>
      </div>
    </div>
  );
}
