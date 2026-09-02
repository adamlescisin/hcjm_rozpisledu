import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, AdminAuthError } from "@/lib/adminAuth";
import { eventUpdateSchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth({ allowViewer: true });
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: { category: true, recurrenceRule: true },
    });
    if (!event) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
    return NextResponse.json(event);
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth({ allowViewer: false });
    const { id } = await params;
    const body = await request.json();
    const data = eventUpdateSchema.parse(body);

    const scope = body.scope as "this" | "future" | "all" | undefined;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

    if (scope === "all" && existing.recurrenceRuleId) {
      const updated = await prisma.event.updateMany({
        where: { recurrenceRuleId: existing.recurrenceRuleId },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.categoryId && { categoryId: data.categoryId }),
          ...(data.status && { status: data.status }),
        },
      });
      return NextResponse.json({ updated: updated.count });
    }

    if (scope === "future" && existing.recurrenceRuleId) {
      const updated = await prisma.event.updateMany({
        where: {
          recurrenceRuleId: existing.recurrenceRuleId,
          startDatetime: { gte: existing.startDatetime },
        },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.categoryId && { categoryId: data.categoryId }),
          ...(data.status && { status: data.status }),
        },
      });
      return NextResponse.json({ updated: updated.count });
    }

    if (data.startDatetime || data.endDatetime) {
      const startDt = data.startDatetime ? new Date(data.startDatetime) : existing.startDatetime;
      const endDt = data.endDatetime ? new Date(data.endDatetime) : existing.endDatetime;

      const conflicts = await prisma.event.findMany({
        where: {
          id: { not: id },
          venueId: existing.venueId,
          status: { not: "CANCELLED" },
          startDatetime: { lt: endDt },
          endDatetime: { gt: startDt },
        },
      });

      if (conflicts.length > 0) {
        return NextResponse.json({
          error: "Kolize",
          message: `Termín se překrývá s ${conflicts.length} existujícím(i) termínem/termíny.`,
          conflicts,
        }, { status: 409 });
      }
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.status && { status: data.status }),
        ...(data.startDatetime && { startDatetime: new Date(data.startDatetime) }),
        ...(data.endDatetime && { endDatetime: new Date(data.endDatetime) }),
      },
      include: { category: true },
    });

    return NextResponse.json(event);
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth({ allowViewer: false });
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") as "this" | "future" | "all" | null;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

    if (scope === "all" && existing.recurrenceRuleId) {
      const deleted = await prisma.event.deleteMany({
        where: { recurrenceRuleId: existing.recurrenceRuleId },
      });
      await prisma.recurrenceRule.delete({ where: { id: existing.recurrenceRuleId } });
      return NextResponse.json({ deleted: deleted.count });
    }

    if (scope === "future" && existing.recurrenceRuleId) {
      const deleted = await prisma.event.deleteMany({
        where: {
          recurrenceRuleId: existing.recurrenceRuleId,
          startDatetime: { gte: existing.startDatetime },
        },
      });
      return NextResponse.json({ deleted: deleted.count });
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ deleted: 1 });
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
