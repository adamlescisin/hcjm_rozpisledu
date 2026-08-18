"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { EventCategory, Venue } from "@prisma/client";
import {
  startOfWeek,
  addDays,
  formatDate,
  formatDateShort,
  formatTime,
  CZECH_DAYS_SHORT,
  CZECH_MONTHS,
} from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, Plus, Pencil } from "lucide-react";
import AdminEventModal, { AdminEventForEdit } from "./AdminEventModal";

// Grid constants — must match ScheduleView
const GRID_START_H = 6;
const GRID_END_H = 23;
const TOTAL_HOURS = GRID_END_H - GRID_START_H;
const PX_PER_HOUR = 60; // 1 px = 1 minute
const GRID_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;
const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => GRID_START_H + i);

type ViewMode = "day" | "week" | "month";

interface EventWithDetails extends AdminEventForEdit {
  category: EventCategory;
}

interface AdminCalendarViewProps {
  categories: EventCategory[];
  venues: Venue[];
}

// Snap y (pixels = minutes offset from grid start) to nearest 15-min boundary
function snapTo15(y: number): number {
  return Math.round(y / 15) * 15;
}

function yToMinutes(y: number): number {
  return GRID_START_H * 60 + snapTo15(Math.max(0, Math.min(GRID_HEIGHT, y)));
}

function getMinutesInPrague(isoString: string): number {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

function getGridPos(startIso: string, endIso: string) {
  const startMin = getMinutesInPrague(startIso);
  const endMin = getMinutesInPrague(endIso);
  const gridStartMin = GRID_START_H * 60;
  const top = Math.max(0, startMin - gridStartMin);
  const height = Math.max(18, endMin - startMin);
  return { top, height: Math.min(height, GRID_HEIGHT - top) };
}

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ─── Grid background ──────────────────────────────────────────────────────────

function GridLines() {
  return (
    <>
      {Array.from({ length: TOTAL_HOURS }, (_, h) => (
        <div key={h} className="absolute inset-x-0" style={{ top: h * PX_PER_HOUR, height: PX_PER_HOUR }}>
          <div className="absolute inset-x-0 top-0 border-t border-gray-200" />
          <div className="absolute inset-x-0 border-t border-gray-100" style={{ top: 15 }} />
          <div className="absolute inset-x-0 border-t border-gray-100" style={{ top: 30 }} />
          <div className="absolute inset-x-0 border-t border-gray-100" style={{ top: 45 }} />
        </div>
      ))}
      <div className="absolute inset-x-0 border-t border-gray-200" style={{ top: GRID_HEIGHT }} />
    </>
  );
}

// ─── Admin event block in the time grid ──────────────────────────────────────

function AdminGridEvent({
  event,
  onEdit,
}: {
  event: EventWithDetails;
  onEdit: () => void;
}) {
  const { top, height } = getGridPos(event.startDatetime, event.endDatetime);
  const color = event.category.color;
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);
  const isCancelled = event.status === "CANCELLED";

  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onEdit}
      className="absolute left-0.5 right-0.5 rounded overflow-hidden border-l-2 text-left hover:brightness-90 transition-all z-20 group"
      style={{
        top,
        height,
        borderLeftColor: color,
        backgroundColor: color + (isCancelled ? "11" : "22"),
        opacity: isCancelled ? 0.55 : 1,
      }}
      title="Klikněte pro úpravu"
    >
      <div className="px-1.5 py-0.5 h-full">
        <div className="text-[10px] font-semibold leading-tight" style={{ color }}>
          {formatTime(start)}
          {height >= 36 ? ` — ${formatTime(end)}` : ""}
        </div>
        {height >= 30 && (
          <div className="text-[11px] font-medium leading-tight truncate text-gray-800 mt-0.5">
            {event.title}
          </div>
        )}
        {height >= 48 && (
          <div className="text-[10px] leading-tight truncate mt-0.5" style={{ color }}>
            {event.category.name}
          </div>
        )}
      </div>
      {/* Edit indicator */}
      <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-0.5">
        <Pencil size={9} style={{ color }} />
      </div>
      {event.status === "TENTATIVE" && (
        <div className="absolute bottom-0.5 right-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded leading-tight">
          ?
        </div>
      )}
      {isCancelled && (
        <div className="absolute bottom-0.5 right-1 text-[9px] bg-red-100 text-red-500 px-1 rounded leading-tight">
          zrušeno
        </div>
      )}
    </button>
  );
}

// ─── Drag-to-create overlay ───────────────────────────────────────────────────

interface DragSelection {
  startY: number;
  currentY: number;
}

// ─── Day column with drag support ────────────────────────────────────────────

function AdminDayColumn({
  day,
  events,
  onSlotSelect,
  onEventEdit,
  isWeekend = false,
}: {
  day: Date;
  events: EventWithDetails[];
  onSlotSelect: (day: Date, startMin: number, endMin: number) => void;
  onEventEdit: (event: EventWithDetails) => void;
  isWeekend?: boolean;
}) {
  const [drag, setDrag] = useState<DragSelection | null>(null);
  const colRef = useRef<HTMLDivElement>(null);

  const getY = (clientY: number): number => {
    if (!colRef.current) return 0;
    const rect = colRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(GRID_HEIGHT, clientY - rect.top));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const y = getY(e.clientY);
    setDrag({ startY: y, currentY: y });
    colRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag((d) => (d ? { ...d, currentY: getY(e.clientY) } : null));
  };

  const handlePointerUp = () => {
    if (!drag) return;
    const topY = Math.min(drag.startY, drag.currentY);
    const botY = Math.max(drag.startY, drag.currentY);
    const startMin = yToMinutes(topY);
    const endMin = yToMinutes(botY);
    const duration = endMin - startMin;

    if (duration < 15) {
      // Click: open modal with 1h default
      onSlotSelect(day, startMin, startMin + 60);
    } else {
      onSlotSelect(day, startMin, endMin);
    }
    setDrag(null);
  };

  const selTop = drag ? Math.min(drag.startY, drag.currentY) : 0;
  const selHeight = drag ? Math.abs(drag.currentY - drag.startY) : 0;

  return (
    <div
      ref={colRef}
      className={`relative select-none ${isWeekend ? "bg-gray-50/30" : "bg-white"}`}
      style={{ height: GRID_HEIGHT, cursor: "crosshair" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <GridLines />

      {/* Drag selection preview */}
      {drag && selHeight > 4 && (
        <div
          className="absolute left-0.5 right-0.5 rounded border-2 border-blue-400 bg-blue-100/60 z-30 pointer-events-none"
          style={{ top: selTop, height: selHeight }}
        >
          {selHeight >= 20 && (
            <span className="text-[10px] text-blue-600 font-medium px-1">
              {Math.round((yToMinutes(Math.max(drag.startY, drag.currentY)) -
                yToMinutes(Math.min(drag.startY, drag.currentY))) / 60 * 10) / 10}h
            </span>
          )}
        </div>
      )}

      {events.map((e) => (
        <AdminGridEvent key={e.id} event={e} onEdit={() => onEventEdit(e)} />
      ))}
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function AdminDayTimeGrid({
  date,
  events,
  onSlotSelect,
  onEventEdit,
}: {
  date: Date;
  events: EventWithDetails[];
  onSlotSelect: (day: Date, startMin: number, endMin: number) => void;
  onEventEdit: (event: EventWithDetails) => void;
}) {
  const dayEvents = events.filter((e) => {
    const d = new Date(e.startDatetime);
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  });

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-700 mb-3">{formatDate(date)}</h2>
      <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Hour labels */}
        <div
          className="w-12 flex-shrink-0 bg-gray-50 border-r border-gray-200 relative select-none"
          style={{ height: GRID_HEIGHT }}
        >
          {HOUR_LABELS.map((hour, i) => (
            <div
              key={hour}
              className="absolute right-1.5 text-[10px] text-gray-400 font-medium"
              style={{ top: i * PX_PER_HOUR - 6 }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <AdminDayColumn
            day={date}
            events={dayEvents}
            onSlotSelect={onSlotSelect}
            onEventEdit={onEventEdit}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function AdminWeekTimeGrid({
  date,
  events,
  onSlotSelect,
  onEventEdit,
}: {
  date: Date;
  events: EventWithDetails[];
  onSlotSelect: (day: Date, startMin: number, endMin: number) => void;
  onEventEdit: (event: EventWithDetails) => void;
}) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = PX_PER_HOUR * 1;
    }
  }, []);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Day header row */}
      <div className="flex border-b border-gray-200">
        <div className="w-12 flex-shrink-0 bg-gray-50" />
        {days.map((day, i) => {
          const isToday =
            day.getFullYear() === today.getFullYear() &&
            day.getMonth() === today.getMonth() &&
            day.getDate() === today.getDate();
          const isWeekend = i >= 5;
          return (
            <div
              key={i}
              className={`flex-1 min-w-0 text-center py-2 px-1 text-xs font-semibold border-l border-gray-200 ${
                isToday
                  ? "bg-[var(--color-primary)] text-white"
                  : isWeekend
                  ? "bg-gray-50/80 text-gray-500"
                  : "bg-gray-50 text-gray-500"
              }`}
            >
              <div>{CZECH_DAYS_SHORT[i]}</div>
              <div className={`text-sm font-bold ${isToday ? "text-white" : "text-gray-800"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex overflow-y-auto" style={{ maxHeight: "65vh" }}>
        {/* Hour labels */}
        <div
          className="w-12 flex-shrink-0 bg-gray-50 border-r border-gray-200 relative select-none"
          style={{ height: GRID_HEIGHT, minHeight: GRID_HEIGHT }}
        >
          {HOUR_LABELS.map((hour, i) => (
            <div
              key={hour}
              className="absolute right-1.5 text-[10px] text-gray-400 font-medium"
              style={{ top: i * PX_PER_HOUR - 6 }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, i) => {
          const dayEvents = events.filter((e) => {
            const d = new Date(e.startDatetime);
            return (
              d.getFullYear() === day.getFullYear() &&
              d.getMonth() === day.getMonth() &&
              d.getDate() === day.getDate()
            );
          });
          return (
            <div
              key={i}
              className="flex-1 min-w-0 border-l border-gray-200"
              style={{ minHeight: GRID_HEIGHT }}
            >
              <AdminDayColumn
                day={day}
                events={dayEvents}
                onSlotSelect={onSlotSelect}
                onEventEdit={onEventEdit}
                isWeekend={i >= 5}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function AdminMonthView({
  date,
  events,
  onDayClick,
  onEventEdit,
}: {
  date: Date;
  events: EventWithDetails[];
  onDayClick: (day: Date) => void;
  onEventEdit: (event: EventWithDetails) => void;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const endPad = (7 - ((lastDay.getDay() + 1) % 7)) % 7;

  const calDays: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
    ...Array(endPad).fill(null),
  ];

  return (
    <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-xl overflow-hidden">
      {CZECH_DAYS_SHORT.map((d) => (
        <div
          key={d}
          className="text-center py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200"
        >
          {d}
        </div>
      ))}
      {calDays.map((day, i) => {
        if (!day) {
          return (
            <div
              key={`pad-${i}`}
              className="min-h-[90px] bg-gray-50/30 border-r last:border-r-0 border-t border-gray-100"
            />
          );
        }
        const isToday =
          day.getFullYear() === new Date().getFullYear() &&
          day.getMonth() === new Date().getMonth() &&
          day.getDate() === new Date().getDate();

        const dayEvents = events.filter((e) => {
          const d = new Date(e.startDatetime);
          return (
            d.getFullYear() === day.getFullYear() &&
            d.getMonth() === day.getMonth() &&
            d.getDate() === day.getDate()
          );
        });

        return (
          <div
            key={i}
            className="min-h-[90px] p-1 border-r last:border-r-0 border-t border-gray-100 bg-white group"
          >
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => onDayClick(day)}
                className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                  isToday
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-gray-600 hover:bg-[var(--color-primary)]/10"
                }`}
                title="Vytvořit událost"
              >
                {day.getDate()}
              </button>
              <button
                onClick={() => onDayClick(day)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-[var(--color-primary)]"
                title="Nová událost"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="space-y-0.5">
              {dayEvents.slice(0, 3).map((e) => {
                const color = e.category.color;
                return (
                  <button
                    key={e.id}
                    onClick={() => onEventEdit(e)}
                    className="w-full text-left text-xs px-1 py-0.5 rounded truncate font-medium hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: color + "30", color }}
                    title={e.title}
                  >
                    {formatTime(new Date(e.startDatetime))} {e.title}
                  </button>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} další</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main AdminCalendarView ───────────────────────────────────────────────────

type ModalState =
  | { type: "create"; date: Date; startMin: number; endMin: number }
  | { type: "edit"; event: EventWithDetails };

export default function AdminCalendarView({ categories, venues }: AdminCalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const getDateRange = useCallback(() => {
    const date = new Date(currentDate);
    if (viewMode === "day") {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (viewMode === "week") {
      const start = startOfWeek(date);
      const end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        from: start.toISOString(),
        to: end.toISOString(),
      });
      const res = await fetch(`/api/admin/events?${params}`);
      const data = await res.json();
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const navigate = (direction: 1 | -1) => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + direction);
    else if (viewMode === "week") d.setDate(d.getDate() + 7 * direction);
    else d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  };

  const getHeaderLabel = () => {
    const { start, end } = getDateRange();
    if (viewMode === "day") return formatDate(currentDate);
    if (viewMode === "week") return `${formatDateShort(start)} — ${formatDateShort(end)}`;
    return `${CZECH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split("-").map(Number);
    setCurrentDate(new Date(y, m - 1, d));
  };

  const handleSlotSelect = (day: Date, startMin: number, endMin: number) => {
    setModal({ type: "create", date: day, startMin, endMin });
  };

  const handleEventEdit = (event: EventWithDetails) => {
    setModal({ type: "edit", event });
  };

  const handleDayClick = (day: Date) => {
    // Default 08:00–09:00 when clicking from month view
    setModal({ type: "create", date: day, startMin: 8 * 60, endMin: 9 * 60 });
  };

  const handleModalClose = () => setModal(null);

  const handleSaved = () => {
    setModal(null);
    fetchEvents();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* View mode */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === mode
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {mode === "day" ? "Den" : mode === "week" ? "Týden" : "Měsíc"}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Předchozí"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="relative">
            <button
              onClick={openDatePicker}
              className="text-sm font-medium min-w-[180px] text-center hover:text-[var(--color-primary)] transition-colors underline-offset-2 hover:underline"
              title="Vybrat datum"
            >
              {getHeaderLabel()}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="sr-only absolute inset-0 opacity-0 pointer-events-none"
              value={toDateInputValue(currentDate)}
              onChange={handleDateSelect}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Následující"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar size={14} />
            Dnes
          </button>
        </div>

        {/* Create button */}
        <button
          onClick={() => {
            const now = new Date();
            const min = now.getHours() * 60 + now.getMinutes();
            const snapped = Math.round(min / 15) * 15;
            handleSlotSelect(currentDate, snapped, snapped + 60);
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Nová událost
        </button>
      </div>

      {/* Hint */}
      {!loading && viewMode !== "month" && (
        <p className="text-xs text-gray-400 mb-2 select-none">
          Klikněte nebo táhněte v mřížce pro vytvoření události · Klikněte na událost pro úpravu
        </p>
      )}

      {/* Calendar content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[var(--color-primary)]" />
        </div>
      ) : viewMode === "day" ? (
        <AdminDayTimeGrid
          date={currentDate}
          events={events}
          onSlotSelect={handleSlotSelect}
          onEventEdit={handleEventEdit}
        />
      ) : viewMode === "week" ? (
        <AdminWeekTimeGrid
          date={currentDate}
          events={events}
          onSlotSelect={handleSlotSelect}
          onEventEdit={handleEventEdit}
        />
      ) : (
        <AdminMonthView
          date={currentDate}
          events={events}
          onDayClick={handleDayClick}
          onEventEdit={handleEventEdit}
        />
      )}

      {/* Event modal */}
      {modal?.type === "create" && (
        <AdminEventModal
          key={`create-${modal.date.toISOString()}-${modal.startMin}`}
          categories={categories}
          venues={venues}
          onClose={handleModalClose}
          onSaved={handleSaved}
          initialDate={modal.date}
          initialStartMinutes={modal.startMin}
          initialEndMinutes={modal.endMin}
        />
      )}
      {modal?.type === "edit" && (
        <AdminEventModal
          key={`edit-${modal.event.id}`}
          categories={categories}
          venues={venues}
          onClose={handleModalClose}
          onSaved={handleSaved}
          event={modal.event}
        />
      )}
    </div>
  );
}
