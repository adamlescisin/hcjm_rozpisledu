export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import AdminCalendarView from "@/components/admin/AdminCalendarView";

export default async function AdminCalendarPage() {
  const [categories, venues] = await Promise.all([
    prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.venue.findMany(),
  ]);

  return (
    <div>
      <AdminNav />
      <AdminCalendarView
        categories={JSON.parse(JSON.stringify(categories))}
        venues={JSON.parse(JSON.stringify(venues))}
      />
    </div>
  );
}
