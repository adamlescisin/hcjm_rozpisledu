export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminRole } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminThemeClient from "@/components/admin/AdminThemeClient";

export default async function AdminThemePage() {
  const [theme, role] = await Promise.all([
    prisma.themeSettings.findFirst(),
    getAdminRole(),
  ]);

  if (role === "VIEWER") redirect("/admin");

  return (
    <div>
      <AdminNav />
      <AdminThemeClient theme={theme ? JSON.parse(JSON.stringify(theme)) : null} />
    </div>
  );
}
