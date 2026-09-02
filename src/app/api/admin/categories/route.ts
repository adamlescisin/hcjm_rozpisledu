import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, AdminAuthError } from "@/lib/adminAuth";
import { categorySchema } from "@/lib/validations";

export async function GET() {
  const categories = await prisma.eventCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth({ allowViewer: false });
    const body = await request.json();
    const data = categorySchema.parse(body);
    const category = await prisma.eventCategory.create({ data });
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
