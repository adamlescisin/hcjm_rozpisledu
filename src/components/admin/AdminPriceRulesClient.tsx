"use client";

import { useState } from "react";
import { EventCategory } from "@prisma/client";
import { Plus, Trash2, Pencil, Save, X, Loader2, Info } from "lucide-react";

const DAYS_CZ = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

interface PriceRule {
  id: string;
  label: string;
  categoryId: string | null;
  dayOfWeekFrom: number | null;
  dayOfWeekTo: number | null;
  timeFrom: string | null;
  timeTo: string | null;
  priceCzk: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  category: EventCategory | null;
}

const emptyForm = {
  label: "",
  categoryId: "",
  dayOfWeekFrom: "",
  dayOfWeekTo: "",
  timeFrom: "",
  timeTo: "",
  priceCzk: 0,
  validFrom: "",
  validTo: "",
  isActive: true,
};

interface Props {
  rules: PriceRule[];
  categories: EventCategory[];
  isViewer?: boolean;
}

export default function AdminPriceRulesClient({ rules: initial, categories, isViewer = false }: Props) {
  const [rules, setRules] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (id?: string) => {
    setLoading(true);
    setError(null);

    const body = {
      label: form.label,
      categoryId: form.categoryId || null,
      dayOfWeekFrom: form.dayOfWeekFrom !== "" ? parseInt(form.dayOfWeekFrom) : null,
      dayOfWeekTo: form.dayOfWeekTo !== "" ? parseInt(form.dayOfWeekTo) : null,
      timeFrom: form.timeFrom || null,
      timeTo: form.timeTo || null,
      priceCzk: form.priceCzk,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      isActive: form.isActive,
    };

    const url = id ? `/api/admin/price-rules/${id}` : "/api/admin/price-rules";
    const method = id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Chyba");
      setLoading(false);
      return;
    }

    if (id) {
      setRules((prev) => prev.map((r) => (r.id === id ? data : r)));
      setEditId(null);
    } else {
      setRules((prev) => [...prev, data]);
      setShowAdd(false);
      setForm(emptyForm);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat cenové pravidlo?")) return;
    const res = await fetch(`/api/admin/price-rules/${id}`, { method: "DELETE" });
    if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const startEdit = (rule: PriceRule) => {
    setEditId(rule.id);
    setForm({
      label: rule.label,
      categoryId: rule.categoryId ?? "",
      dayOfWeekFrom: rule.dayOfWeekFrom !== null ? String(rule.dayOfWeekFrom) : "",
      dayOfWeekTo: rule.dayOfWeekTo !== null ? String(rule.dayOfWeekTo) : "",
      timeFrom: rule.timeFrom ?? "",
      timeTo: rule.timeTo ?? "",
      priceCzk: rule.priceCzk,
      validFrom: rule.validFrom ? rule.validFrom.slice(0, 10) : "",
      validTo: rule.validTo ? rule.validTo.slice(0, 10) : "",
      isActive: rule.isActive,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Cenová pravidla</h1>
        {!isViewer && (
          <button
            onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} />
            Nové pravidlo
          </button>
        )}
      </div>

      <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        Ceny jsou interní evidence pro budoucí platební systém. Na veřejném rozpisu se nezobrazují.
      </div>

      {showAdd && (
        <div className="mb-4 bg-white rounded-xl border p-4">
          <RuleForm
            form={form}
            setForm={setForm}
            categories={categories}
            onSave={() => handleSave()}
            onCancel={() => setShowAdd(false)}
            loading={loading}
            error={error}
          />
        </div>
      )}

      <div className="space-y-2">
        {rules.length === 0 && !showAdd && (
          <div className="text-center py-10 text-gray-400 text-sm">Žádná cenová pravidla</div>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-xl border overflow-hidden">
            {editId === rule.id ? (
              <div className="p-4">
                <RuleForm
                  form={form}
                  setForm={setForm}
                  categories={categories}
                  onSave={() => handleSave(rule.id)}
                  onCancel={() => setEditId(null)}
                  loading={loading}
                  error={error}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{rule.label}</span>
                    {!rule.isActive && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">Neaktivní</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 space-x-2">
                    {rule.category && <span>Kategorie: {rule.category.name}</span>}
                    {rule.dayOfWeekFrom !== null && <span>{DAYS_CZ[rule.dayOfWeekFrom]}{rule.dayOfWeekTo !== null ? ` – ${DAYS_CZ[rule.dayOfWeekTo]}` : ""}</span>}
                    {rule.timeFrom && <span>{rule.timeFrom}–{rule.timeTo}</span>}
                    {rule.validFrom && <span>Od {rule.validFrom.slice(0, 10)}</span>}
                    {rule.validTo && <span>Do {rule.validTo.slice(0, 10)}</span>}
                  </div>
                </div>
                <div className="text-base font-bold text-gray-900 flex-shrink-0">
                  {rule.priceCzk.toLocaleString("cs-CZ")} Kč
                </div>
                {!isViewer && (
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(rule)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
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
  categories: EventCategory[];
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

function RuleForm({ form, setForm, categories, onSave, onCancel, loading, error }: FormProps) {
  const f = (key: keyof typeof emptyForm) => (
    value: string | number | boolean
  ) => setForm({ ...form, [key]: value });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Název pravidla *</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => f("label")(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Víkendová sazba"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kategorie (volitelné)</label>
          <select
            value={form.categoryId}
            onChange={(e) => f("categoryId")(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Všechny kategorie</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cena (Kč) *</label>
          <input
            type="number"
            value={form.priceCzk}
            onChange={(e) => f("priceCzk")(parseInt(e.target.value))}
            min={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Den od</label>
          <select
            value={form.dayOfWeekFrom}
            onChange={(e) => f("dayOfWeekFrom")(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">—</option>
            {DAYS_CZ.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Den do</label>
          <select
            value={form.dayOfWeekTo}
            onChange={(e) => f("dayOfWeekTo")(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">—</option>
            {DAYS_CZ.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Čas od</label>
          <input type="time" value={form.timeFrom} onChange={(e) => f("timeFrom")(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Čas do</label>
          <input type="time" value={form.timeTo} onChange={(e) => f("timeTo")(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Platnost od</label>
          <input type="date" value={form.validFrom} onChange={(e) => f("validFrom")(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Platnost do</label>
          <input type="date" value={form.validTo} onChange={(e) => f("validTo")(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => f("isActive")(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
        Aktivní
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <X size={14} /> Zrušit
        </button>
        <button type="button" onClick={onSave} disabled={loading || !form.label} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Uložit
        </button>
      </div>
    </div>
  );
}
