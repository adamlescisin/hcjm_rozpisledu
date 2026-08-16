"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { EventCategory } from "@prisma/client";
import { startOfWeek, addDays, formatDate, formatDateShort, formatTime, CZECH_DAYS_SHORT, CZECH_MONTHS } from "@/lib/utils";
import EventBlock, { EventModal, type EventWithCategory } from "./EventBlock";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type ViewMode = "day" | "week" | "month";

// Time grid constants — 06:00 to 23:00, 60 px per hour (= 1 px per minute)
const GRID_START_H = 6;
const GRID_END_H = 23;
const TOTAL_HOURS = GRID_END_H - GRID_START_H; // 17
const PX_PER_HOUR = 60;
const GRID_HEIGHT = TOTAL_HOURS * PX_PER_HOUR; // 1020 px
const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => GRID_START_H + i);

interface ScheduleViewProps {
  categories: EventCategory[];
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

function getResurfacing(event: EventWithCategory) {
  const { category } = event;
  const mode = event.iceResurfacingMode;
  let before: boolean;
  let after: boolean;
  if (mode === "none") { before = false; after = false; }
  else if (mode === "before") { before = true; after = false; }
  else if (mode === "after") { before = false; after = true; }
  else if (mode === "both") { before = true; after = true; }
  else {
    before = category.requiresIceResurfacingBefore;
    after = category.requiresIceResurfacingAfter;
  }
  return { before, after, duration: category.resurfacingDurationMinutes };
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Shared grid background ──────────────────────────────────────────────────

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

// ─── Event rendered inside the time grid ─────────────────────────────────────

function GridEvent({ event }: { event: EventWithCategory }) {
  const [showDetail, setShowDetail] = useState(false);
  const { top, height } = getGridPos(event.startDatetime, event.endDatetime);
  const { before, after, duration } = getResurfacing(event);
  const color = event.category.color;
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);

  const resurfPx = duration; // 1 px per minute
  const beforeTop = top - resurfPx;
  const afterTop = top + height;

  return (
    <>
      {before && beforeTop >= -resurfPx && (
        <div
          className="absolute left-0.5 right-0.5 rounded-t flex items-center justify-center overflow-hidden z-10"
          style={{
            top: Math.max(0, beforeTop),
            height: beforeTop < 0 ? resurfPx + beforeTop : resurfPx,
            background: "repeating-linear-gradient(45deg,#f3f4f6 0px,#f3f4f6 3px,#e5e7eb 3px,#e5e7eb 7px)",
          }}
        >
          {resurfPx >= 18 && (
            <span className="text-[9px] text-gray-400 font-medium select-none">Úprava</span>
          )}
        </div>
      )}

      <button
        onClick={() => setShowDetail(true)}
        className="absolute left-0.5 right-0.5 rounded overflow-hidden border-l-2 text-left hover:brightness-95 transition-all z-20"
        style={{
          top,
          height,
          borderLeftColor: color,
          backgroundColor: color + "22",
        }}
      >
        <div className="px-1.5 py-0.5">
          <div className="text-[10px] font-semibold leading-tight" style={{ color }}>
            {formatTime(start)}{height >= 36 ? ` — ${formatTime(end)}` : ""}
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
        {event.status === "TENTATIVE" && (
          <div className="absolute top-0.5 right-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded leading-tight">
            ?
          </div>
        )}
      </button>

      {after && afterTop < GRID_HEIGHT && (
        <div
          className="absolute left-0.5 right-0.5 rounded-b flex items-center justify-center overflow-hidden z-10"
          style={{
            top: afterTop,
            height: Math.min(resurfPx, GRID_HEIGHT - afterTop),
            background: "repeating-linear-gradient(45deg,#f3f4f6 0px,#f3f4f6 3px,#e5e7eb 3px,#e5e7eb 7px)",
          }}
        >
          {resurfPx >= 18 && (
            <span className="text-[9px] text-gray-400 font-medium select-none">Úprava</span>
          )}
        </div>
      )}

      {showDetail && <EventModal event={event} onClose={() => setShowDetail(false)} />}
    </>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayTimeGrid({ date, events }: { date: Date; events: EventWithCategory[] }) {
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

        {/* Events column */}
        <div className="flex-1 relative" style={{ height: GRID_HEIGHT }}>
          <GridLines />
          {dayEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm select-none pointer-events-none">
              Žádné události
            </div>
          )}
          {dayEvents.map((e) => (
            <GridEvent key={e.id} event={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekTimeGrid({ date, events }: { date: Date; events: EventWithCategory[] }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to 06:00 on mount (top of working hours is already visible, scroll to show business hours)
  useEffect(() => {
    if (scrollRef.current) {
      // Scroll to show 07:00 at the top (1 hour offset)
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

      {/* Scrollable time grid body */}
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
          const isWeekend = i >= 5;

          return (
            <div
              key={i}
              className={`flex-1 min-w-0 relative border-l border-gray-200 ${
                isWeekend ? "bg-gray-50/30" : "bg-white"
              }`}
              style={{ height: GRID_HEIGHT, minHeight: GRID_HEIGHT }}
            >
              <GridLines />
              {dayEvents.map((e) => (
                <GridEvent key={e.id} event={e} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month view (unchanged) ───────────────────────────────────────────────────

function MonthView({ date, events }: { date: Date; events: EventWithCategory[] }) {
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
    <div>
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-xl overflow-hidden">
        {CZECH_DAYS_SHORT.map((d) => (
          <div key={d} className="text-center py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
            {d}
          </div>
        ))}
        {calDays.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} className="min-h-[90px] bg-gray-50/30 border-r last:border-r-0 border-t border-gray-100" />;
          }
          const isToday =
            day.getFullYear() === new Date().getFullYear() &&
            day.getMonth() === new Date().getMonth() &&
            day.getDate() === new Date().getDate();

          const dayEvents = events.filter((e) => {
            const d = new Date(e.startDatetime);
            return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
          });

          return (
            <div key={i} className="min-h-[90px] p-1 border-r last:border-r-0 border-t border-gray-100 bg-white">
              <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? "bg-[var(--color-primary)] text-white" : "text-gray-600"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <EventBlock key={e.id} event={e} compact mini />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} další</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ScheduleView ────────────────────────────────────────────────────────

export default function ScheduleView({ categories }: ScheduleViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<EventWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
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
      const res = await fetch(`/api/events?${params}`);
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

  const goToToday = () => setCurrentDate(new Date());

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredEvents = events.filter(
    (e) => selectedCategories.size === 0 || selectedCategories.has(e.categoryId)
  );

  const getHeaderLabel = () => {
    const { start, end } = getDateRange();
    if (viewMode === "day") return formatDate(currentDate);
    if (viewMode === "week") return `${formatDateShort(start)} — ${formatDateShort(end)}`;
    return `${CZECH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split("-").map(Number);
    setCurrentDate(new Date(y, m - 1, d));
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Controls */}
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
        <div className="flex items-center gap-2">
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
            onClick={goToToday}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar size={14} />
            Dnes
          </button>
        </div>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => {
            const active = selectedCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border-2 transition-all ${
                  active ? "opacity-50" : "opacity-100"
                }`}
                style={{
                  borderColor: cat.color,
                  backgroundColor: active ? "transparent" : cat.color + "20",
                  color: cat.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[var(--color-primary)]" />
        </div>
      ) : viewMode === "day" ? (
        <DayTimeGrid date={currentDate} events={filteredEvents} />
      ) : viewMode === "week" ? (
        <WeekTimeGrid date={currentDate} events={filteredEvents} />
      ) : (
        <MonthView date={currentDate} events={filteredEvents} />
      )}
    </div>
  );
}
