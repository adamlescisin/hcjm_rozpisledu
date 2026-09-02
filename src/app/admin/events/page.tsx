export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminRole } from "@/lib/adminAuth";
import AdminNav from "@/components/admin/AdminNav";
import AdminEventsClient from "@/components/admin/AdminEventsClient";

export default async function AdminEventsPage() {
  const [events, categories, venues, role] = await Promise.all([
    prisma.event.findMany({
      where: {
        startDatetime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { category: true },
      orderBy: { startDatetime: "asc" },
      take: 100,
    }),
    prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.venue.findMany(),
    getAdminRole(),
  ]);

  return (
    <div>
      <AdminNav isViewer={role === "VIEWER"} />
      <AdminEventsClient
        initialEvents={JSON.parse(JSON.stringify(events))}
        categories={JSON.parse(JSON.stringify(categories))}
        venues={JSON.parse(JSON.stringify(venues))}
        isViewer={role === "VIEWER"}
      />
    </div>
  );
}
