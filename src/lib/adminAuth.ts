import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@prisma/client";

export class AdminAuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

interface AdminAuthResult {
  supabaseUserId: string;
  email: string;
  role: AdminRole;
}

export async function requireAdminAuth(options?: { allowViewer?: boolean }): Promise<AdminAuthResult> {
  const allowViewer = options?.allowViewer ?? false;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new AdminAuthError(401, "Unauthorized");

  const adminUser = await prisma.adminUser.findUnique({ where: { email: user.email } });
  if (!adminUser) throw new AdminAuthError(401, "Unauthorized");

  if (!allowViewer && adminUser.role === "VIEWER") {
    throw new AdminAuthError(403, "Forbidden");
  }

  return { supabaseUserId: user.id, email: user.email, role: adminUser.role };
}

export async function getAdminRole(): Promise<AdminRole | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const adminUser = await prisma.adminUser.findUnique({ where: { email: user.email } });
    return adminUser?.role ?? null;
  } catch {
    return null;
  }
}
