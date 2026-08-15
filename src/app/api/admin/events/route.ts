import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { eventSchema, recurrenceEventSchema } from "@/lib/validations";
import { generateRecurringEvents } from "@/lib/recurrence";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
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
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();

    // Check if creating a recurring event
    if (body.recurrence) {
      const data = recurrenceEventSchema.parse(body);
      const events = await generateRecurringEvents(data, user.id);
      return NextResponse.json({ created: events.length, events });
    }

    const data = eventSchema.parse(body);

    // Check for conflicts
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
        createdBy: user.id,
      },
      include: { category: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
