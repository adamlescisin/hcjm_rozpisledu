import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, AdminAuthError } from "@/lib/adminAuth";
import { eventSchema, recurrenceEventSchema } from "@/lib/validations";
import { generateRecurringEvents } from "@/lib/recurrence";

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth({ allowViewer: true });
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (from) where.startDatetime = { gte: new Date(from) };
    if (to) {
      where.endDatetime = { ...(where.endDatetime as object || {}), lte: new Date(to) };
    }

    const events = await prisma.event.findMany({
      where,
      include: { category: true, recurrenceRule: true },
      orderBy: { startDatetime: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId } = await requireAdminAuth({ allowViewer: false });
    const body = await request.json();

    if (body.recurrence) {
      const data = recurrenceEventSchema.parse(body);
      const count = await generateRecurringEvents(data, supabaseUserId);
      return NextResponse.json({ created: count });
    }

    const data = eventSchema.parse(body);

    const conflicts = await prisma.event.findMany({
      where: {
        venueId: data.venueId,
        status: { not: "CANCELLED" },
        OR: [
          {
            startDatetime: { lt: new Date(data.endDatetime) },
            endDatetime: { gt: new Date(data.startDatetime) },
          },
        ],
      },
      include: { category: true },
    });

    if (conflicts.length > 0) {
      return NextResponse.json({
        error: "Kolize",
        message: `Termín se překrývá s ${conflicts.length} existujícím(i) termínem/termíny.`,
        conflicts,
      }, { status: 409 });
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        startDatetime: new Date(data.startDatetime),
        endDatetime: new Date(data.endDatetime),
        createdBy: supabaseUserId,
      },
      include: { category: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
