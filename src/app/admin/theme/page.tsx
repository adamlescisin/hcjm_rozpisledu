export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import AdminThemeClient from "@/components/admin/AdminThemeClient";

export default async function AdminThemePage() {
  const theme = await prisma.themeSettings.findFirst();

  return (
    <div>
      <AdminNav />
      <AdminThemeClient theme={theme ? JSON.parse(JSON.stringify(theme)) : null} />
    </div>
  );
}
