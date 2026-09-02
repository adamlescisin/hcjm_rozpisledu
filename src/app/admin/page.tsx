export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminRole } from "@/lib/adminAuth";
import AdminNav from "@/components/admin/AdminNav";
import Link from "next/link";
import { Calendar, Tag, DollarSign, Palette, Plus } from "lucide-react";

export default async function AdminDashboard() {
  const [eventCount, categoryCount, upcomingEvents, role] = await Promise.all([
    prisma.event.count({ where: { status: { not: "CANCELLED" } } }),
    prisma.eventCategory.count({ where: { isActive: true } }),
    prisma.event.findMany({
      where: {
        startDatetime: { gte: new Date() },
        status: { not: "CANCELLED" },
      },
      include: { category: true },
      orderBy: { startDatetime: "asc" },
      take: 5,
    }),
    getAdminRole(),
  ]);

  const isViewer = role === "VIEWER";

  const stats = [
    { label: "Aktivní události", value: eventCount, icon: Calendar, href: "/admin/events" },
    { label: "Kategorie", value: categoryCount, icon: Tag, href: "/admin/categories" },
  ];

  return (
    <div>
      <AdminNav isViewer={isViewer} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Přehled</h1>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Icon size={15} />
                {label}
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            </Link>
          ))}
          <Link
            href="/admin/price-rules"
            className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
          >
            <DollarSign size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Cenová pravidla</span>
          </Link>
          {!isViewer && (
            <Link
              href="/admin/theme"
              className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
            >
              <Palette size={20} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Nastavení vzhledu</span>
            </Link>
          )}
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-xl border">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Nadcházející události</h2>
            <Link href="/admin/events" className="text-sm text-[var(--color-primary)] hover:underline">
              Zobrazit vše
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              Žádné nadcházející události
            </div>
          ) : (
            <div className="divide-y">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.category.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{event.title}</div>
                    <div className="text-xs text-gray-500">
                      {event.startDatetime.toLocaleDateString("cs-CZ", {
                        weekday: "short", day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
                      })}
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full hidden sm:block"
                    style={{ backgroundColor: event.category.color + "20", color: event.category.color }}
                  >
                    {event.category.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
