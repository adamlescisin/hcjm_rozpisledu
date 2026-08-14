"use client";

import { useState } from "react";
import { EventCategory } from "@prisma/client";
import { formatTime } from "@/lib/utils";
import { X, Clock, Tag } from "lucide-react";

interface EventWithCategory {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string;
  status: string;
  category: EventCategory;
}

interface EventBlockProps {
  event: EventWithCategory;
  compact?: boolean;
  mini?: boolean;
}

export default function EventBlock({ event, compact, mini }: EventBlockProps) {
  const [showDetail, setShowDetail] = useState(false);
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);
  const color = event.category.color;

  if (mini) {
    return (
      <>
        <button
          onClick={() => setShowDetail(true)}
          className="w-full text-left text-xs px-1 py-0.5 rounded truncate font-medium"
          style={{ backgroundColor: color + "30", color }}
          title={`${event.title} ${formatTime(start)}`}
        >
          {formatTime(start)} {event.title}
        </button>
        {showDetail && <EventModal event={event} onClose={() => setShowDetail(false)} />}
      </>
    );
  }

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowDetail(true)}
          className="w-full text-left mb-1 rounded-md px-1.5 py-1 text-xs font-medium border-l-2 transition-opacity hover:opacity-80"
          style={{
            borderLeftColor: color,
            backgroundColor: color + "18",
            color: "var(--color-text)",
          }}
        >
          <div className="font-semibold text-[11px]" style={{ color }}>
            {formatTime(start)}
          </div>
          <div className="truncate leading-tight">{event.title}</div>
        </button>
        {showDetail && <EventModal event={event} onClose={() => setShowDetail(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className="w-full text-left flex items-start gap-3 p-3 rounded-xl border-l-4 mb-2 hover:shadow-sm transition-all"
        style={{
          borderLeftColor: color,
          backgroundColor: color + "12",
        }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{event.title}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: color + "25", color }}
            >
              {event.category.name}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Clock size={11} />
            {formatTime(start)} — {formatTime(end)}
          </div>
        </div>
        {event.status === "TENTATIVE" && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
            Předběžně
          </span>
        )}
      </button>
      {showDetail && <EventModal event={event} onClose={() => setShowDetail(false)} />}
    </>
  );
}

function EventModal({ event, onClose }: { event: EventWithCategory; onClose: () => void }) {
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);
  const color = event.category.color;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-1 h-12 rounded-full flex-shrink-0 mr-3"
            style={{ backgroundColor: color }}
          />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-base">{event.title}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Tag size={12} style={{ color }} />
              <span className="text-sm" style={{ color }}>
                {event.category.name}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Clock size={14} />
          {start.toLocaleDateString("cs-CZ", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Prague",
          })}
        </div>
        <div className="text-sm text-gray-800 font-medium mb-3">
          {formatTime(start)} — {formatTime(end)}
        </div>

        {event.description && (
          <p className="text-sm text-gray-600 border-t pt-3">{event.description}</p>
        )}

        {event.status === "TENTATIVE" && (
          <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg text-xs text-amber-700">
            Tento termín je předběžný a může být změněn.
          </div>
        )}
      </div>
    </div>
  );
}
