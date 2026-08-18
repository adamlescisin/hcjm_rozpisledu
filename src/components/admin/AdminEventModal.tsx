"use client";

import { useState } from "react";
import { EventCategory, Venue } from "@prisma/client";
import { X, Loader2, AlertCircle, CheckCircle2, Trash2, ChevronDown } from "lucide-react";

type IceMode = "inherit" | "none" | "before" | "after" | "both";
type DeleteScope = "this" | "future" | "all";

export interface AdminEventForEdit {
  id: string;
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
  categories: EventCategory[];
  venues: Venue[];
  onClose: () => void;
  onSaved: () => void;
  // Create mode
  initialDate?: Date;
  initialStartMinutes?: number;
  initialEndMinutes?: number;
  // Edit mode
  event?: AdminEventForEdit;
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function minutesToDate(day: Date, minutesFromMidnight: number): Date {
  const d = new Date(day);
  d.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return d;
}

export default function AdminEventModal({
  categories,
  venues,
  onClose,
  onSaved,
  initialDate,
  initialStartMinutes,
  initialEndMinutes,
  event,
}: Props) {
  const isEdit = !!event;
  const defaultVenueId = venues[0]?.id ?? "";

  const initStartDt = (): string => {
    if (event) return toDatetimeLocal(new Date(event.startDatetime));
    if (initialDate && initialStartMinutes !== undefined)
      return toDatetimeLocal(minutesToDate(initialDate, initialStartMinutes));
    return toDatetimeLocal(new Date());
  };

  const initEndDt = (): string => {
    if (event) return toDatetimeLocal(new Date(event.endDatetime));
    if (initialDate && initialEndMinutes !== undefined)
      return toDatetimeLocal(minutesToDate(initialDate, initialEndMinutes));
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return toDatetimeLocal(d);
  };

  const initIceMode = (): IceMode => {
    const m = event?.iceResurfacingMode;
    if (m === "none" || m === "before" || m === "after" || m === "both") return m;
    return "inherit";
  };

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startDt, setStartDt] = useState(initStartDt);
  const [endDt, setEndDt] = useState(initEndDt);
  const [status, setStatus] = useState(event?.status ?? "CONFIRMED");
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? categories[0]?.id ?? "");
  const [venueId, setVenueId] = useState(event?.venueId ?? defaultVenueId);
  const [iceMode, setIceMode] = useState<IceMode>(initIceMode);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<{ title: string; startDatetime: string }[]>([]);

  // Delete flow
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<DeleteScope>("this");
  const [deleting, setDeleting] = useState(false);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryBefore = selectedCategory?.requiresIceResurfacingBefore ?? false;
  const categoryAfter = selectedCategory?.requiresIceResurfacingAfter ?? false;
  const resurfDuration = selectedCategory?.resurfacingDurationMinutes ?? 15;

  const handleStartChange = (val: string) => {
    setStartDt(val);
    if (selectedCategory && val) {
      const start = new Date(val);
      const end = new Date(start.getTime() + selectedCategory.defaultDurationMinutes * 60000);
      setEndDt(toDatetimeLocal(end));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setConflicts([]);

    const body: Record<string, unknown> = {
      venueId,
      categoryId,
      title,
      description: description || null,
      startDatetime: new Date(startDt).toISOString(),
      endDatetime: new Date(endDt).toISOString(),
      status,
      iceResurfacingMode: iceMode === "inherit" ? null : iceMode,
    };

    const url = isEdit ? `/api/admin/events/${event!.id}` : "/api/admin/events";
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

    setLoading(false);
    onSaved();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(
      `/api/admin/events/${event!.id}?scope=${event?.recurrenceRuleId ? deleteScope : "this"}`,
      { method: "DELETE" }
    );
    setDeleting(false);
    if (res.ok) {
      onSaved();
    } else {
      setError("Nepodařilo se smazat událost.");
      setDeleteOpen(false);
    }
  };

  const iceModeLabel = (mode: IceMode) => {
    const parts: string[] = [];
    if (mode === "inherit") {
      if (categoryBefore) parts.push("před");
      if (categoryAfter) parts.push("po");
      return parts.length > 0
        ? `Dle kategorie (${parts.join(" + ")}, ${resurfDuration} min)`
        : "Dle kategorie (žádná)";
    }
    if (mode === "none") return "Žádná";
    if (mode === "before") return `Před (${resurfDuration} min)`;
    if (mode === "after") return `Po (${resurfDuration} min)`;
    return `Před i po (${resurfDuration} min)`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900 text-base">
            {isEdit ? "Upravit událost" : "Nová událost"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Název *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Trénink přípravka"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Kategorie *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 text-xs font-medium transition-all ${
                    categoryId === cat.id ? "border-current shadow-sm" : "border-transparent bg-gray-100 text-gray-600"
                  }`}
                  style={
                    categoryId === cat.id
                      ? { borderColor: cat.color, backgroundColor: cat.color + "20", color: cat.color }
                      : {}
                  }
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
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                Místo *
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                Začátek *
              </label>
              <input
                type="datetime-local"
                value={startDt}
                onChange={(e) => handleStartChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                Konec *
              </label>
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
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Stav
            </label>
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
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    status === value
                      ? value === "CONFIRMED"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : value === "TENTATIVE"
                        ? "bg-amber-50 border-amber-500 text-amber-700"
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
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Úprava ledu
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(["inherit", "none", "before", "after", "both"] as IceMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setIceMode(mode)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
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
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Poznámka
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
              placeholder="Volitelná poznámka..."
            />
          </div>

          {/* Error / conflicts */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {conflicts.length > 0 && (
                  <ul className="mt-1 list-disc list-inside text-xs opacity-80">
                    {conflicts.slice(0, 5).map((c, i) => (
                      <li key={i}>
                        {c.title} (
                        {new Date(c.startDatetime).toLocaleDateString("cs-CZ", {
                          timeZone: "Europe/Prague",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        )
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Delete section (edit mode only) */}
          {isEdit && (
            <div className="border-t pt-4">
              {!deleteOpen ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={13} />
                  Smazat událost
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-red-700">Potvrdit smazání</p>
                  {event?.recurrenceRuleId && (
                    <div className="flex gap-2">
                      {(["this", "future", "all"] as DeleteScope[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDeleteScope(s)}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            deleteScope === s
                              ? "bg-red-100 border-red-400 text-red-700"
                              : "border-red-200 text-red-500 hover:bg-red-50"
                          }`}
                        >
                          {s === "this" ? "Tuto" : s === "future" ? "Tuto a následující" : "Celou sérii"}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(false)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Zrušit
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting && <Loader2 size={12} className="animate-spin" />}
                      Smazat
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading || !venueId}
              className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? "Uložit" : "Vytvořit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
