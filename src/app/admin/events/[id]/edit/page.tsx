export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminRole } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import EventForm from "@/components/admin/EventForm";
import { notFound } from "next/navigation";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [event, categories, venues, role] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: { recurrenceRule: true },
    }),
    prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.venue.findMany(),
    getAdminRole(),
  ]);

  if (!event) notFound();
  if (role === "VIEWER") redirect("/admin/events");

  return (
    <div>
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Upravit událost</h1>
        <EventForm
          event={JSON.parse(JSON.stringify(event))}
          categories={JSON.parse(JSON.stringify(categories))}
          venues={JSON.parse(JSON.stringify(venues))}
        />
      </div>
    </div>
  );
}
