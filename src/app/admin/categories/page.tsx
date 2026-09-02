export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminRole } from "@/lib/adminAuth";
import AdminNav from "@/components/admin/AdminNav";
import AdminCategoriesClient from "@/components/admin/AdminCategoriesClient";

export default async function AdminCategoriesPage() {
  const [categories, role] = await Promise.all([
    prisma.eventCategory.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    getAdminRole(),
  ]);

  return (
    <div>
      <AdminNav isViewer={role === "VIEWER"} />
      <AdminCategoriesClient
        categories={JSON.parse(JSON.stringify(categories))}
        isViewer={role === "VIEWER"}
      />
    </div>
  );
}
