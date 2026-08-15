export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import AdminPriceRulesClient from "@/components/admin/AdminPriceRulesClient";

export default async function AdminPriceRulesPage() {
  const [rules, categories] = await Promise.all([
    prisma.priceRule.findMany({
      include: { category: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div>
      <AdminNav />
      <AdminPriceRulesClient
        rules={JSON.parse(JSON.stringify(rules))}
        categories={JSON.parse(JSON.stringify(categories))}
      />
    </div>
  );
}
