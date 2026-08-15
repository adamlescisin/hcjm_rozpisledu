"use client";

import { useState, useEffect, useCallback } from "react";
import { EventCategory } from "@prisma/client";
import { startOfWeek, addDays, formatDate, formatDateShort, CZECH_DAYS_SHORT, CZECH_MONTHS } from "@/lib/utils";
import EventBlock from "./EventBlock";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type ViewMode = "day" | "week" | "month";

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
  const [viewMode, setViewMode] = useState<ViewMode>("week");
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
    if (viewMode === "week") {
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
    if (viewMode === "week") {
      const s = formatDateShort(start);
      const e = formatDateShort(end);
      return `${s} — ${e}`;
    }
    return `${CZECH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* View mode switcher */}
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
