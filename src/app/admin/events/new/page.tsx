export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminRole } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import EventForm from "@/components/admin/EventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const [{ start, end }, categories, venues, role] = await Promise.all([
    searchParams,
    prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.venue.findMany(),
    getAdminRole(),
  ]);

  if (role === "VIEWER") redirect("/admin/events");

  return (
    <div>
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Nová událost</h1>
        <EventForm
          categories={JSON.parse(JSON.stringify(categories))}
          venues={JSON.parse(JSON.stringify(venues))}
          defaultStart={start}
          defaultEnd={end}
        />
      </div>
    </div>
  );
}
