export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import AdminCategoriesClient from "@/components/admin/AdminCategoriesClient";

export default async function AdminCategoriesPage() {
  const categories = await prisma.eventCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <AdminNav />
      <AdminCategoriesClient categories={JSON.parse(JSON.stringify(categories))} />
    </div>
  );
}
