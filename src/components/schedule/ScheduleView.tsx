"use client";

import { useState, useEffect, useCallback } from "react";
import { EventCategory } from "@prisma/client";
import { startOfWeek, addDays, formatDate, formatDateShort, CZECH_DAYS_SHORT, CZECH_MONTHS, isSameDay } from "@/lib/utils";
import EventBlock from "./EventBlock";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type ViewMode = "day" | "week" | "month" | "timetable";

interface EventWithCategory {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string;
  status: string;
  categoryId: string;
  category: EventCategory;
}

interface ScheduleViewProps {
  categories: EventCategory[];
}

export default function ScheduleView({ categories }: ScheduleViewProps) {
  const [viewMode] = useState<ViewMode>("timetable");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<EventWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = useCallback(() => {
    const date = new Date(currentDate);
    if (viewMode === "day") {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (viewMode === "week" || viewMode === "timetable") {
      const start = startOfWeek(date);
      const end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    // month
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
    else if (viewMode === "week" || viewMode === "timetable") d.setDate(d.getDate() + 7 * direction);
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
    if (viewMode === "week" || viewMode === "timetable") {
      const s = formatDateShort(start);
      const e = formatDateShort(end);
      return `${s} — ${e}`;
    }
    return `${CZECH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  return (
    <div className="p-4 mx-auto max-w-7xl">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Předchozí"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {getHeaderLabel()}
          </span>
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
        <DayView date={currentDate} events={filteredEvents} />
      ) : viewMode === "week" ? (
        <WeekView date={currentDate} events={filteredEvents} />
      ) : viewMode === "timetable" ? (
        <TimetableView date={currentDate} events={filteredEvents} />
      ) : (
        <MonthView date={currentDate} events={filteredEvents} />
      )}
    </div>
  );
}

function DayView({ date, events }: { date: Date; events: EventWithCategory[] }) {
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
      <h2 className="text-base font-semibold text-gray-700 mb-3">
        {formatDate(date)}
      </h2>
      {dayEvents.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Žádné události v tento den</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((e) => <EventBlock key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}

function WeekView({ date, events }: { date: Date; events: EventWithCategory[] }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      {days.map((day, i) => {
        const isToday =
          day.getFullYear() === new Date().getFullYear() &&
          day.getMonth() === new Date().getMonth() &&
          day.getDate() === new Date().getDate();
        return (
          <div
            key={i}
            className={`text-center py-2 px-1 text-xs font-semibold border-b border-gray-200 ${
              isToday ? "bg-[var(--color-primary)] text-white" : "bg-gray-50 text-gray-500"
            }`}
          >
            <div>{CZECH_DAYS_SHORT[i]}</div>
            <div className={`text-sm font-bold ${isToday ? "text-white" : "text-gray-800"}`}>
              {day.getDate()}
            </div>
          </div>
        );
      })}

      {/* Event cells */}
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
            className={`min-h-[100px] p-1 border-r last:border-r-0 border-gray-100 ${
              isWeekend ? "bg-gray-50/50" : "bg-white"
            }`}
          >
            {dayEvents.map((e) => (
              <EventBlock key={e.id} event={e} compact />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ date, events }: { date: Date; events: EventWithCategory[] }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Pad to start on Monday
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
            <div
              key={i}
              className="min-h-[90px] p-1 border-r last:border-r-0 border-t border-gray-100 bg-white"
            >
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

// ─── Timetable view (days top-to-bottom, timeslots left-to-right) ─────────────

const PIXELS_PER_HOUR = 80;
const PIXELS_PER_MIN = PIXELS_PER_HOUR / 60;
const DAY_LABEL_WIDTH = 88;
const ROW_BASE_HEIGHT = 56;
const TRACK_HEIGHT = 48;

function assignTracks(dayEvents: EventWithCategory[]): {
  assignments: Map<string, number>;
  numTracks: number;
} {
  const sorted = [...dayEvents].sort(
    (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  );
  const trackEnds: number[] = [];
  const assignments = new Map<string, number>();
  for (const event of sorted) {
    const startMs = new Date(event.startDatetime).getTime();
    const endMs = new Date(event.endDatetime).getTime();
    let track = trackEnds.findIndex((end) => end <= startMs);
    if (track === -1) track = trackEnds.length;
    trackEnds[track] = endMs;
    assignments.set(event.id, track);
  }
  return { assignments, numTracks: Math.max(1, trackEnds.length) };
}

function TimetableView({ date, events }: { date: Date; events: EventWithCategory[] }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  // Derive time range from events, fallback 08:00–22:00
  let minHour = 8;
  let maxHour = 22;
  if (events.length > 0) {
    let eMin = 24, eMax = 0;
    for (const e of events) {
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
  const gridWidth = totalHours * PIXELS_PER_HOUR;

  const hourMarks = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);
  const quarterOffsets: number[] = [];
  for (let h = 0; h < totalHours; h++) {
    for (let q = 1; q <= 3; q++) {
      quarterOffsets.push(h * 60 + q * 15);
    }
  }

  function toPixels(minutes: number) {
    return minutes * PIXELS_PER_MIN;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <div style={{ minWidth: DAY_LABEL_WIDTH + gridWidth }}>
        {/* Time header row */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div
            className="flex-shrink-0 border-r border-gray-200"
            style={{ width: DAY_LABEL_WIDTH, height: 36 }}
          />
          <div className="relative flex-1" style={{ height: 36, width: gridWidth }}>
            {/* Hour labels */}
            {hourMarks.map((h) => (
              <div
                key={h}
                className="absolute top-0 bottom-0 flex items-center"
                style={{ left: (h - minHour) * PIXELS_PER_HOUR }}
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
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.startDatetime), day)
          );
          const { assignments, numTracks } = assignTracks(dayEvents);
          const rowHeight = Math.max(ROW_BASE_HEIGHT, numTracks * TRACK_HEIGHT + 8);
          const trackH = (rowHeight - 8) / numTracks;

          return (
            <div
              key={dayIdx}
              className={`flex border-b last:border-b-0 border-gray-100 ${
                isWeekend ? "bg-gray-50/40" : "bg-white"
              }`}
            >
              {/* Day label */}
              <div
                className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 ${
                  isToday ? "bg-[var(--color-primary)]/10" : ""
                }`}
                style={{ width: DAY_LABEL_WIDTH, height: rowHeight }}
              >
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    isToday ? "text-[var(--color-primary)]" : "text-gray-400"
                  }`}
                >
                  {CZECH_DAYS_SHORT[dayIdx]}
                </span>
                <span
                  className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-gray-800"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Grid + events */}
              <div className="relative" style={{ width: gridWidth, height: rowHeight }}>
                {/* Hour vertical lines (primary) */}
                {hourMarks.map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-gray-200"
                    style={{ left: (h - minHour) * PIXELS_PER_HOUR }}
                  />
                ))}
                {/* 15-min tick lines (secondary) */}
                {quarterOffsets.map((m) => (
                  <div
                    key={m}
                    className="absolute top-0 bottom-0 border-l border-gray-100"
                    style={{ left: toPixels(m) }}
                  />
                ))}

                {/* Events — span columns by duration */}
                {dayEvents.map((event) => {
                  const s = new Date(event.startDatetime);
                  const en = new Date(event.endDatetime);
                  const startMin = Math.max(
                    0,
                    s.getHours() * 60 + s.getMinutes() - minHour * 60
                  );
                  const endMin = Math.min(
                    totalMinutes,
                    en.getHours() * 60 + en.getMinutes() - minHour * 60
                  );
                  const left = toPixels(startMin);
                  // Minimum visible width = 1 quarter slot
                  const width = Math.max(toPixels(endMin - startMin), PIXELS_PER_HOUR / 4);
                  const track = assignments.get(event.id) ?? 0;
                  const top = 4 + track * trackH;
                  const height = trackH - 2;
                  return (
                    <EventBlock
                      key={event.id}
                      event={event}
                      timetable
                      timetableStyle={{ left, width, top, height }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
