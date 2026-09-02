export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminRole } from "@/lib/adminAuth";
import AdminNav from "@/components/admin/AdminNav";
import AdminEventsClient from "@/components/admin/AdminEventsClient";

export default async function AdminEventsPage() {
  const [categories, venues, role] = await Promise.all([
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
        categories={JSON.parse(JSON.stringify(categories))}
        venues={JSON.parse(JSON.stringify(venues))}
        isViewer={role === "VIEWER"}
      />
    </div>
  );
}
