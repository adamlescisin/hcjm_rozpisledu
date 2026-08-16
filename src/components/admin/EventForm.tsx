"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventCategory, Venue } from "@prisma/client";
import { Loader2, Plus, Minus, AlertCircle, CheckCircle2 } from "lucide-react";

const DAYS_CZ = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

type IceMode = "inherit" | "none" | "before" | "after" | "both";

interface EventData {
  id?: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string;
  status: string;
  categoryId: string;
  venueId: string;
  recurrenceRuleId: string | null;
  iceResurfacingMode?: string | null;
}

interface Props {
  event?: EventData;
  categories: EventCategory[];
  venues: Venue[];
}

export default function EventForm({ event, categories, venues }: Props) {
  const router = useRouter();
  const isEdit = !!event?.id;
  const defaultVenueId = venues[0]?.id ?? "";

  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const nowLocal = () => toLocalDatetime(new Date().toISOString());
  const plusHour = () => toLocalDatetime(new Date(Date.now() + 3600000).toISOString());

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startDt, setStartDt] = useState(event ? toLocalDatetime(event.startDatetime) : nowLocal());
  const [endDt, setEndDt] = useState(event ? toLocalDatetime(event.endDatetime) : plusHour());
  const [status, setStatus] = useState(event?.status ?? "CONFIRMED");
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? categories[0]?.id ?? "");
  const [venueId, setVenueId] = useState(event?.venueId ?? defaultVenueId);

  // Ice resurfacing override
  const storedMode = event?.iceResurfacingMode;
  const [iceMode, setIceMode] = useState<IceMode>(
    storedMode === "none" || storedMode === "before" || storedMode === "after" || storedMode === "both"
      ? storedMode
      : "inherit"
  );

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [untilDate, setUntilDate] = useState("");
  const [occurrenceCount, setOccurrenceCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<{ title: string; startDatetime: string }[]>([]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // What ice resurfacing the category implies
  const categoryBefore = selectedCategory?.requiresIceResurfacingBefore ?? false;
  const categoryAfter = selectedCategory?.requiresIceResurfacingAfter ?? false;
  const categoryHasResurfacing = categoryBefore || categoryAfter;
  const resurfDuration = selectedCategory?.resurfacingDurationMinutes ?? 15;

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const iceModeLabel = (mode: IceMode) => {
    if (mode === "inherit") {
      const parts = [];
      if (categoryBefore) parts.push("před");
      if (categoryAfter) parts.push("po");
      return parts.length > 0
        ? `Dle kategorie (${parts.join(" + ")}, ${resurfDuration} min)`
        : "Dle kategorie (žádná)";
    }
    if (mode === "none") return "Žádná";
    if (mode === "before") return `Před (${resurfDuration} min)`;
    if (mode === "after") return `Po (${resurfDuration} min)`;
    if (mode === "both") return `Před i po (${resurfDuration} min)`;
    return mode;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setConflicts([]);

    const toIso = (local: string) => new Date(local).toISOString();

    const body: Record<string, unknown> = {
      venueId,
      categoryId,
      title,
      description: description || null,
      startDatetime: toIso(startDt),
      endDatetime: toIso(endDt),
      status,
      iceResurfacingMode: iceMode === "inherit" ? null : iceMode,
    };

    if (!isEdit && isRecurring) {
      body.recurrence = {
        frequency,
        interval,
        daysOfWeek: ["WEEKLY", "BIWEEKLY"].includes(frequency) ? daysOfWeek : [],
        untilDate: untilDate ? toIso(untilDate + "T23:59:59") : null,
        occurrenceCount: !untilDate ? occurrenceCount : null,
        exceptions: [],
      };
    }

    const url = isEdit ? `/api/admin/events/${event.id}` : "/api/admin/events";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409 && data.conflicts) {
        setConflicts(data.conflicts);
        setError(data.message);
      } else {
        setError(data.error || "Nastala chyba.");
      }
      setLoading(false);
      return;
    }

    if (isEdit) {
      setSuccess("Událost byla aktualizována.");
      setLoading(false);
    } else {
      const count = data.created ?? 1;
      setSuccess(`${count === 1 ? "Událost byla vytvořena" : `${count} událostí bylo vytvořeno`}.`);
      setTimeout(() => router.push("/admin/events"), 1200);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Název *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Trénink přípravka"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                  categoryId === cat.id ? "border-current shadow-sm" : "border-transparent bg-gray-100"
                }`}
                style={categoryId === cat.id ? { borderColor: cat.color, backgroundColor: cat.color + "20", color: cat.color } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Venue */}
        {venues.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Místo *</label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Začátek *</label>
            <input
              type="datetime-local"
              value={startDt}
              onChange={(e) => {
                setStartDt(e.target.value);
                if (selectedCategory && e.target.value) {
                  const start = new Date(e.target.value);
                  const end = new Date(start.getTime() + selectedCategory.defaultDurationMinutes * 60000);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  setEndDt(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`);
                }
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konec *</label>
            <input
              type="datetime-local"
              value={endDt}
              onChange={(e) => setEndDt(e.target.value)}
              required
              min={startDt}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
          <div className="flex gap-2">
            {[
              { value: "CONFIRMED", label: "Potvrzen" },
              { value: "TENTATIVE", label: "Předběžný" },
              { value: "CANCELLED", label: "Zrušen" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  status === value
                    ? value === "CONFIRMED" ? "bg-green-50 border-green-500 text-green-700"
                      : value === "TENTATIVE" ? "bg-amber-50 border-amber-500 text-amber-700"
                      : "bg-red-50 border-red-500 text-red-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Ice resurfacing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Úprava ledu
            {categoryHasResurfacing && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                (kategorie: {categoryBefore && categoryAfter ? "před i po" : categoryBefore ? "před" : "po"}, {resurfDuration} min)
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {(["inherit", "none", "before", "after", "both"] as IceMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setIceMode(mode)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  iceMode === mode
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {mode === "inherit" && "Dle kategorie"}
                {mode === "none" && "Žádná"}
                {mode === "before" && "Před"}
                {mode === "after" && "Po"}
                {mode === "both" && "Před i po"}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">{iceModeLabel(iceMode)}</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            placeholder="Volitelná poznámka..."
          />
        </div>
      </div>

      {/* Recurrence — only for new events */}
      {!isEdit && (
        <div className="bg-white rounded-xl border p-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm font-medium text-gray-700">Opakující se událost</span>
          </label>

          {isRecurring && (
            <div className="mt-4 space-y-3 pt-3 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Frekvence</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="DAILY">Denně</option>
                    <option value="WEEKLY">Týdně</option>
                    <option value="BIWEEKLY">Ob týden</option>
                    <option value="MONTHLY">Měsíčně</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Interval</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInterval(Math.max(1, interval - 1))}
                      className="p-1 border rounded text-gray-600 hover:bg-gray-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{interval}</span>
                    <button
                      type="button"
                      onClick={() => setInterval(interval + 1)}
                      className="p-1 border rounded text-gray-600 hover:bg-gray-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {(frequency === "WEEKLY" || frequency === "BIWEEKLY") && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dny v týdnu</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`w-9 h-9 rounded-lg text-xs font-medium border transition-colors ${
                          daysOfWeek.includes(day)
                            ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {DAYS_CZ[day]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Opakovat do</label>
                  <input
                    type="date"
                    value={untilDate}
                    onChange={(e) => setUntilDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                {!untilDate && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Počet opakování</label>
                    <input
                      type="number"
                      value={occurrenceCount}
                      onChange={(e) => setOccurrenceCount(parseInt(e.target.value))}
                      min={1}
                      max={365}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error / conflict feedback */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            {conflicts.length > 0 && (
              <ul className="mt-1 list-disc list-inside text-xs opacity-80">
                {conflicts.slice(0, 5).map((c, i) => (
                  <li key={i}>{c.title} ({new Date(c.startDatetime).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })})</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/events")}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Zrušit
        </button>
        <button
          type="submit"
          disabled={loading || !venueId}
          className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {isEdit ? "Uložit změny" : "Vytvořit"}
        </button>
      </div>
    </form>
  );
}
