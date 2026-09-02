"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EventCategory, Venue } from "@prisma/client";
import { formatTime, startOfWeek, addDays, isSameDay, CZECH_DAYS_SHORT, formatDateShort } from "@/lib/utils";
import { Plus, Trash2, Edit2, AlertCircle, ChevronLeft, ChevronRight, LayoutList, CalendarDays, Search, X } from "lucide-react";

interface EventWithCategory {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string;
  status: string;
  recurrenceRuleId: string | null;
  category: EventCategory;
}

interface Props {
  categories: EventCategory[];
  venues: Venue[];
  isViewer?: boolean;
}

// ─── Timetable constants ──────────────────────────────────────────────────────
const PX_PER_HOUR = 80;
const PX_PER_MIN = PX_PER_HOUR / 60;
const DAY_LBL_W = 88;
const ROW_BASE_H = 56;
const TRACK_H = 48;
const PAGE_SIZE = 25;

function assignAdminTracks(dayEvents: EventWithCategory[]) {
  const sorted = [...dayEvents].sort(
    (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  );
  const trackEnds: number[] = [];
  const assignments = new Map<string, number>();
  for (const ev of sorted) {
    const startMs = new Date(ev.startDatetime).getTime();
    const endMs = new Date(ev.endDatetime).getTime();
    let t = trackEnds.findIndex((e) => e <= startMs);
    if (t === -1) t = trackEnds.length;
    trackEnds[t] = endMs;
    assignments.set(ev.id, t);
  }
  return { assignments, numTracks: Math.max(1, trackEnds.length) };
}

export default function AdminEventsClient({ categories, venues, isViewer = false }: Props) {
  // ── List view state ────────────────────────────────────────────────────────
  const [listEvents, setListEvents] = useState<EventWithCategory[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listPage, setListPage] = useState(1);

  // Filter state
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Delete / modal state ───────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<"this" | "future" | "all">("this");
  const [confirmDelete, setConfirmDelete] = useState<EventWithCategory | null>(null);

  // ── View state ─────────────────────────────────────────────────────────────
  const [adminView, setAdminView] = useState<"list" | "timetable">("timetable");
  const [timetableDate, setTimetableDate] = useState(new Date());
  const [timetableEvents, setTimetableEvents] = useState<EventWithCategory[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // ── List fetch ─────────────────────────────────────────────────────────────
  const fetchListEvents = useCallback(async (page: number) => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setListEvents(data.events);
        setListTotal(data.total);
      }
    } finally {
      setListLoading(false);
    }
  }, [search, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (adminView === "list") {
      fetchListEvents(listPage);
    }
  }, [adminView, listPage, fetchListEvents]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (adminView === "list") {
      setListPage(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, dateFrom, dateTo]);

  // ── Timetable fetch ────────────────────────────────────────────────────────
  const fetchTimetableEvents = useCallback(async (date: Date) => {
    const weekStart = startOfWeek(date);
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);
    setTimetableLoading(true);
    try {
      const params = new URLSearchParams({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      });
      const res = await fetch(`/api/admin/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTimetableEvents(data);
      }
    } finally {
      setTimetableLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminView === "timetable") {
      fetchTimetableEvents(timetableDate);
    }
  }, [adminView, timetableDate, fetchTimetableEvents]);

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const params = confirmDelete.recurrenceRuleId ? `?scope=${deleteScope}` : "";

    setDeletingId(confirmDelete.id);
    const res = await fetch(`/api/admin/events/${confirmDelete.id}${params}`, { method: "DELETE" });

    if (res.ok) {
      // Refetch list to reflect deletion
      fetchListEvents(listPage);
    }

    setDeletingId(null);
    setConfirmDelete(null);
  };

  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  const statusLabel: Record<string, string> = {
    CONFIRMED: "Potvrzen",
    CANCELLED: "Zrušen",
    TENTATIVE: "Předběžný",
  };
  const statusColor: Record<string, string> = {
    CONFIRMED: "bg-green-50 text-green-700",
    CANCELLED: "bg-red-50 text-red-700",
    TENTATIVE: "bg-amber-50 text-amber-700",
  };

  const hasActiveFilters = search || categoryFilter || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setCategoryFilter("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Události</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setAdminView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${
                adminView === "list"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LayoutList size={14} />
              Seznam
            </button>
            <button
              onClick={() => setAdminView("timetable")}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${
                adminView === "timetable"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <CalendarDays size={14} />
              Rozvrh
            </button>
          </div>
          {!isViewer && (
            <Link
              href="/admin/events/new"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              Nová událost
            </Link>
          )}
        </div>
      </div>

      {venues.length === 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle size={16} />
          Nejprve vytvořte alespoň jedno místo konání. (Spusťte seed nebo přidejte přes DB.)
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────────────────── */}
      {adminView === "list" && (
        <>
          {/* Filter bar */}
          <div className="bg-white rounded-xl border p-3 mb-3 flex flex-wrap gap-2 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Název</label>
              <form
                onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
                className="flex"
              >
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Hledat…"
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <button
                  type="submit"
                  className="ml-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
                >
                  Hledat
                </button>
              </form>
            </div>

            {/* Category */}
            <div className="min-w-[160px]">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Kategorie</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Všechny</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Datum od</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Datum do</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors self-end"
              >
                <X size={13} />
                Zrušit filtry
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="text-xs text-gray-400 mb-2 px-1">
            {listLoading ? "Načítám…" : `${listTotal} ${listTotal === 1 ? "událost" : listTotal < 5 ? "události" : "událostí"}`}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Název</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kategorie</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Datum a čas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stav</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {listLoading && (
                    <tr>
                      <td colSpan={5} className="text-center py-10">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-[var(--color-primary)]" />
                      </td>
                    </tr>
                  )}
                  {!listLoading && listEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400">
                        {hasActiveFilters ? "Žádné výsledky pro zadané filtry." : "Žádné události."}
                      </td>
                    </tr>
                  )}
                  {!listLoading && listEvents.map((event) => (
                    <tr key={event.id} className={`hover:bg-gray-50 ${event.status === "CANCELLED" ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.category.color }}
                          />
                          <span className="font-medium text-gray-900">{event.title}</span>
                          {event.recurrenceRuleId && (
                            <span className="text-xs text-gray-400">↻</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: event.category.color + "20",
                            color: event.category.color,
                          }}
                        >
                          {event.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(event.startDatetime).toLocaleDateString("cs-CZ", {
                          weekday: "short", day: "numeric", month: "short",
                          timeZone: "Europe/Prague",
                        })}{" "}
                        {formatTime(new Date(event.startDatetime))}–{formatTime(new Date(event.endDatetime))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[event.status]}`}>
                          {statusLabel[event.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!isViewer && (
                          <div className="flex items-center gap-1 justify-end">
                            <Link
                              href={`/admin/events/${event.id}/edit`}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={15} />
                            </Link>
                            <button
                              onClick={() => { setConfirmDelete(event); setDeleteScope("this"); }}
                              disabled={deletingId === event.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <span className="text-xs text-gray-500">
                  Strana {listPage} z {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    disabled={listPage === 1 || listLoading}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Předchozí strana"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - listPage) <= 2)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setListPage(item as number)}
                          disabled={listLoading}
                          className={`w-8 h-8 text-sm rounded-lg border transition-colors disabled:opacity-40 ${
                            item === listPage
                              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                              : "border-gray-200 hover:bg-white"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                    disabled={listPage === totalPages || listLoading}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Následující strana"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Timetable view ─────────────────────────────────────────────────── */}
      {adminView === "timetable" && (
        <AdminTimetable
          events={timetableEvents}
          loading={timetableLoading}
          timetableDate={timetableDate}
          isViewer={isViewer}
          onNavigate={(dir) => {
            const d = new Date(timetableDate);
            d.setDate(d.getDate() + 7 * dir);
            setTimetableDate(d);
          }}
          onGoToToday={() => setTimetableDate(new Date())}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-900 mb-2">Smazat událost?</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{confirmDelete.title}</strong> bude trvale smazána.
            </p>

            {confirmDelete.recurrenceRuleId && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Smazat:</p>
                {(["this", "future", "all"] as const).map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="deleteScope"
                      value={scope}
                      checked={deleteScope === scope}
                      onChange={() => setDeleteScope(scope)}
                      className="accent-[var(--color-primary)]"
                    />
                    {scope === "this" && "Pouze tuto událost"}
                    {scope === "future" && "Tuto a všechny budoucí v sérii"}
                    {scope === "all" && "Celou sérii"}
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin timetable component ─────────────────────────────────────────────────

interface AdminTimetableProps {
  events: EventWithCategory[];
  loading: boolean;
  timetableDate: Date;
  isViewer: boolean;
  onNavigate: (dir: 1 | -1) => void;
  onGoToToday: () => void;
}

function AdminTimetable({ events, loading, timetableDate, isViewer, onNavigate, onGoToToday }: AdminTimetableProps) {
  const router = useRouter();
  const weekStart = startOfWeek(timetableDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const weekEvents = events.filter((e) =>
    days.some((d) => isSameDay(new Date(e.startDatetime), d))
  );

  let minHour = 8;
  let maxHour = 22;
  if (weekEvents.length > 0) {
    let eMin = 24, eMax = 0;
    for (const e of weekEvents) {
      const s = new Date(e.startDatetime);
      const en = new Date(e.endDatetime);
      eMin = Math.min(eMin, s.getHours());
      eMax = Math.max(eMax, en.getHours() + (en.getMinutes() > 0 ? 1 : 0));
    }
    minHour = Math.max(0, eMin);
    maxHour = Math.min(24, eMax);
  }
  const totalHours = Math.max(1, maxHour - minHour);
  const totalMinutes = totalHours * 60;
  const gridWidth = totalHours * PX_PER_HOUR;

  const hourMarks = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);
  const quarterOffsets: number[] = [];
  for (let h = 0; h < totalHours; h++) {
    for (let q = 1; q <= 3; q++) quarterOffsets.push(h * 60 + q * 15);
  }

  function toPixels(minutes: number) {
    return minutes * PX_PER_MIN;
  }

  interface DragState {
    dayIdx: number;
    day: Date;
    startMin: number;
    currentMin: number;
    containerLeft: number;
  }
  const [drag, setDrag] = useState<DragState | null>(null);

  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const minHourRef = useRef(minHour);
  minHourRef.current = minHour;
  const totalMinutesRef = useRef(totalMinutes);
  totalMinutesRef.current = totalMinutes;

  const isDragging = drag !== null;

  useEffect(() => {
    if (!isDragging) return;

    const snapMin = (raw: number) =>
      Math.max(0, Math.min(totalMinutesRef.current, Math.round(raw / 15) * 15));

    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rawMin = ((e.clientX - d.containerLeft) / PX_PER_HOUR) * 60;
      setDrag({ ...d, currentMin: snapMin(rawMin) });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rawMin = ((e.clientX - d.containerLeft) / PX_PER_HOUR) * 60;
      const snapped = snapMin(rawMin);
      const startM = Math.min(d.startMin, snapped);
      const endM = Math.max(d.startMin, snapped);
      const finalEnd = endM <= startM ? startM + 60 : endM;

      const mh = minHourRef.current;
      const startDate = new Date(d.day);
      startDate.setHours(mh + Math.floor(startM / 60), startM % 60, 0, 0);
      const endDate = new Date(d.day);
      endDate.setHours(mh + Math.floor(finalEnd / 60), finalEnd % 60, 0, 0);

      setDrag(null);
      router.push(
        `/admin/events/new?start=${encodeURIComponent(startDate.toISOString())}&end=${encodeURIComponent(endDate.toISOString())}`
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, router]);

  function handleGridMouseDown(e: React.MouseEvent<HTMLDivElement>, dayIdx: number, day: Date) {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const rawMin = ((e.clientX - rect.left) / PX_PER_HOUR) * 60;
    const snapped = Math.max(0, Math.min(totalMinutes, Math.round(rawMin / 15) * 15));
    setDrag({ dayIdx, day, startMin: snapped, currentMin: snapped, containerLeft: rect.left });
  }

  const weekLabel = `${formatDateShort(days[0])} — ${formatDateShort(days[6])}`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onNavigate(-1)}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Předchozí týden"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium min-w-[160px] text-center">{weekLabel}</span>
        <button
          onClick={() => onNavigate(1)}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Následující týden"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={onGoToToday}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Dnes
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[var(--color-primary)]" />
        </div>
      )}
      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <div style={{ minWidth: DAY_LBL_W + gridWidth }}>
            {/* Time header */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <div className="flex-shrink-0 border-r border-gray-200" style={{ width: DAY_LBL_W, height: 36 }} />
              <div className="relative" style={{ height: 36, width: gridWidth }}>
                {hourMarks.map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{ left: (h - minHour) * PX_PER_HOUR }}
                  >
                    <span className="text-[11px] font-semibold text-gray-500 pl-1 select-none">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day rows */}
            {days.map((day, dayIdx) => {
              const isToday = isSameDay(day, today);
              const isWeekend = dayIdx >= 5;
              const dayEvents = events.filter((e) => isSameDay(new Date(e.startDatetime), day));
              const { assignments, numTracks } = assignAdminTracks(dayEvents);
              const rowHeight = Math.max(ROW_BASE_H, numTracks * TRACK_H + 8);
              const trackH = (rowHeight - 8) / numTracks;

              return (
                <div
                  key={dayIdx}
                  className={`flex border-b last:border-b-0 border-gray-100 ${isWeekend ? "bg-gray-50/40" : "bg-white"}`}
                >
                  {/* Day label */}
                  <div
                    className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 ${
                      isToday ? "bg-[var(--color-primary)]/10" : ""
                    }`}
                    style={{ width: DAY_LBL_W, height: rowHeight }}
                  >
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? "text-[var(--color-primary)]" : "text-gray-400"}`}>
                      {CZECH_DAYS_SHORT[dayIdx]}
                    </span>
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-[var(--color-primary)] text-white" : "text-gray-800"}`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Grid + events */}
                  <div
                    className={`relative ${isViewer ? "" : isDragging && drag?.dayIdx === dayIdx ? "select-none" : "cursor-crosshair"}`}
                    style={{ width: gridWidth, height: rowHeight }}
                    onMouseDown={isViewer ? undefined : (e) => handleGridMouseDown(e, dayIdx, day)}
                  >
                    {hourMarks.map((h) => (
                      <div key={h} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: (h - minHour) * PX_PER_HOUR }} />
                    ))}
                    {quarterOffsets.map((m) => (
                      <div key={m} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: toPixels(m) }} />
                    ))}

                    {dayEvents.map((event) => {
                      const s = new Date(event.startDatetime);
                      const en = new Date(event.endDatetime);
                      const startMin = Math.max(0, s.getHours() * 60 + s.getMinutes() - minHour * 60);
                      const endMin = Math.min(totalMinutes, en.getHours() * 60 + en.getMinutes() - minHour * 60);
                      const left = toPixels(startMin);
                      const width = Math.max(toPixels(endMin - startMin), PX_PER_HOUR / 4);
                      const track = assignments.get(event.id) ?? 0;
                      const top = 4 + track * trackH;
                      const height = trackH - 2;
                      const color = event.category.color;

                      const chipContent = width >= 44 ? (
                        <div className="px-1.5 py-0.5 h-full flex flex-col justify-center overflow-hidden">
                          <div className="text-[10px] font-semibold leading-tight truncate" style={{ color }}>{formatTime(s)}</div>
                          <div className="text-[11px] font-medium leading-tight truncate text-gray-800">{event.title}</div>
                        </div>
                      ) : null;

                      const chipStyle = {
                        left: left + 1,
                        width: Math.max(width - 2, 4),
                        top: top + 1,
                        height: height - 2,
                        borderLeftColor: color,
                        backgroundColor: color + "22",
                        opacity: event.status === "CANCELLED" ? 0.45 : 1,
                      };

                      return isViewer ? (
                        <div
                          key={event.id}
                          title={`${event.title}  ${formatTime(s)}–${formatTime(en)}`}
                          className="absolute rounded overflow-hidden text-left border-l-2"
                          style={chipStyle}
                        >
                          {chipContent}
                        </div>
                      ) : (
                        <Link
                          key={event.id}
                          href={`/admin/events/${event.id}/edit`}
                          title={`${event.title}  ${formatTime(s)}–${formatTime(en)}`}
                          className="absolute rounded overflow-hidden text-left hover:brightness-95 transition-all border-l-2 group"
                          style={chipStyle}
                        >
                          {chipContent}
                        </Link>
                      );
                    })}

                    {!isViewer && drag && drag.dayIdx === dayIdx && (
                      <div
                        className="absolute top-1 bottom-1 rounded pointer-events-none border border-blue-400 bg-blue-200/40"
                        style={{
                          left: toPixels(Math.min(drag.startMin, drag.currentMin)) + 1,
                          width: Math.max(toPixels(Math.abs(drag.currentMin - drag.startMin)), 4),
                        }}
                      >
                        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] font-semibold text-blue-700 pointer-events-none select-none">
                          {drag.currentMin !== drag.startMin && (
                            <>
                              {String(minHour + Math.floor(Math.min(drag.startMin, drag.currentMin) / 60)).padStart(2, "0")}
                              :{String(Math.min(drag.startMin, drag.currentMin) % 60).padStart(2, "0")}
                              {" – "}
                              {String(minHour + Math.floor(Math.max(drag.startMin, drag.currentMin) / 60)).padStart(2, "0")}
                              :{String(Math.max(drag.startMin, drag.currentMin) % 60).padStart(2, "0")}
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
