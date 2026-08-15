"use client";

import { useState } from "react";
import Link from "next/link";
import { EventCategory, Venue } from "@prisma/client";
import { formatTime } from "@/lib/utils";
import { Plus, Trash2, Edit2, AlertCircle } from "lucide-react";

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
  initialEvents: EventWithCategory[];
  categories: EventCategory[];
  venues: Venue[];
}

export default function AdminEventsClient({ initialEvents, categories, venues }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<"this" | "future" | "all">("this");
  const [confirmDelete, setConfirmDelete] = useState<EventWithCategory | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const params = confirmDelete.recurrenceRuleId
      ? `?scope=${deleteScope}`
      : "";

    setDeletingId(confirmDelete.id);
    const res = await fetch(`/api/admin/events/${confirmDelete.id}${params}`, {
      method: "DELETE",
    });

    if (res.ok) {
      if (deleteScope === "this" || !confirmDelete.recurrenceRuleId) {
        setEvents((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      } else if (deleteScope === "all") {
        setEvents((prev) =>
          prev.filter((e) => e.recurrenceRuleId !== confirmDelete.recurrenceRuleId)
        );
      } else {
        const cutoff = confirmDelete.startDatetime;
        setEvents((prev) =>
          prev.filter(
            (e) =>
              e.recurrenceRuleId !== confirmDelete.recurrenceRuleId ||
              e.startDatetime < cutoff
          )
        );
      }
    }

    setDeletingId(null);
    setConfirmDelete(null);
  };

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Události</h1>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Nová událost
        </Link>
      </div>

      {venues.length === 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle size={16} />
          Nejprve vytvořte alespoň jedno místo konání. (Spusťte seed nebo přidejte přes DB.)
        </div>
      )}

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
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    Žádné události. Vytvořte první!
                  </td>
                </tr>
              )}
              {events.map((event) => (
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
