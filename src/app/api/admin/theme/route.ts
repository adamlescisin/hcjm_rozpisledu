import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, AdminAuthError } from "@/lib/adminAuth";
import { themeSchema } from "@/lib/validations";

export async function GET() {
  const theme = await prisma.themeSettings.findFirst();
  return NextResponse.json(theme);
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminAuth({ allowViewer: false });
    const body = await request.json();
    const data = themeSchema.parse(body);

    const existing = await prisma.themeSettings.findFirst();
    const theme = existing
      ? await prisma.themeSettings.update({ where: { id: existing.id }, data })
      : await prisma.themeSettings.create({ data });

    return NextResponse.json(theme);
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
