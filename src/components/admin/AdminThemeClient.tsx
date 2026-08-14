"use client";

import { useState } from "react";
import { Save, Loader2, Eye } from "lucide-react";

interface Theme {
  id?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
}

const DEFAULTS: Theme = {
  primaryColor: "#003d80",
  secondaryColor: "#c8102e",
  accentColor: "#f5a623",
  fontHeading: "Inter",
  fontBody: "Inter",
  logoUrl: null,
};

const FONTS = ["Inter", "Roboto", "Open Sans", "Poppins", "Montserrat", "Lato"];

interface Props {
  theme: Theme | null;
}

export default function AdminThemeClient({ theme }: Props) {
  const [form, setForm] = useState<Theme>(theme ?? DEFAULTS);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = (key: keyof Theme) => (value: string | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Chyba ukládání");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const colorField = (key: keyof Theme, label: string) => (
    <div key={key}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={String(form[key])}
          onChange={(e) => f(key)(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5"
        />
        <input
          type="text"
          value={String(form[key])}
          onChange={(e) => f(key)(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nastavení vzhledu</h1>
        <button
          onClick={() => setPreview(!preview)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <Eye size={15} />
          {preview ? "Skrýt náhled" : "Náhled"}
        </button>
      </div>

      {/* Live preview */}
      {preview && (
        <div
          className="mb-6 rounded-xl overflow-hidden border shadow-sm"
          style={{
            ["--color-primary" as string]: form.primaryColor,
            ["--color-secondary" as string]: form.secondaryColor,
            ["--color-accent" as string]: form.accentColor,
          }}
        >
          <div className="bg-[var(--color-primary)] text-white px-4 py-3">
            <div className="font-bold text-lg">Rozpis ledu</div>
            <div className="text-sm opacity-80">HC Junior Mělník — ZS Mělník</div>
          </div>
          <div className="p-4 bg-white">
            <div className="flex gap-2 mb-3">
              {["Den", "Týden", "Měsíc"].map((mode, i) => (
                <div
                  key={mode}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    i === 1 ? "text-white" : "bg-gray-100 text-gray-600"
                  }`}
                  style={i === 1 ? { backgroundColor: form.primaryColor } : {}}
                >
                  {mode}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div
                className="px-3 py-2 rounded-lg border-l-4 text-sm"
                style={{ borderLeftColor: "#EAB308", backgroundColor: "#EAB30820" }}
              >
                <span className="font-semibold">08:00 — Trénink přípravka</span>
              </div>
              <div
                className="px-3 py-2 rounded-lg border-l-4 text-sm"
                style={{ borderLeftColor: form.secondaryColor, backgroundColor: form.secondaryColor + "20" }}
              >
                <span className="font-semibold">10:00 — Zápas dorostenci</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-5 space-y-5">
        {/* Colors */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Barvy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {colorField("primaryColor", "Primární barva")}
            {colorField("secondaryColor", "Sekundární barva")}
            {colorField("accentColor", "Akcentová barva")}
          </div>
        </div>

        {/* Fonts */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Písma</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nadpisové písmo</label>
              <select
                value={form.fontHeading}
                onChange={(e) => f("fontHeading")(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {FONTS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Textové písmo</label>
              <select
                value={form.fontBody}
                onChange={(e) => f("fontBody")(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {FONTS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Logo</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL loga</label>
            <input
              type="url"
              value={form.logoUrl ?? ""}
              onChange={(e) => f("logoUrl")(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="https://..."
            />
            {form.logoUrl && (
              <img
                src={form.logoUrl}
                alt="Logo náhled"
                className="mt-2 h-10 object-contain"
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Nastavení bylo uloženo.</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Uložit nastavení
        </button>
      </div>
    </div>
  );
}
