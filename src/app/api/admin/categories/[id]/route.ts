import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, AdminAuthError } from "@/lib/adminAuth";
import { categorySchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth({ allowViewer: false });
    const { id } = await params;
    const body = await request.json();
    const data = categorySchema.partial().parse(body);
    const category = await prisma.eventCategory.update({ where: { id }, data });
    return NextResponse.json(category);
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth({ allowViewer: false });
    const { id } = await params;
    const hasEvents = await prisma.event.findFirst({ where: { categoryId: id } });
    if (hasEvents) {
      return NextResponse.json(
        { error: "Kategorii nelze smazat, protože má přiřazené události." },
        { status: 409 }
      );
    }
    await prisma.eventCategory.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
