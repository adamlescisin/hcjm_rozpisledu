import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, AdminAuthError } from "@/lib/adminAuth";
import { eventSchema, recurrenceEventSchema } from "@/lib/validations";
import { generateRecurringEvents } from "@/lib/recurrence";

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth({ allowViewer: true });
    const { searchParams } = new URL(request.url);

    // Timetable mode: from/to range, returns plain array
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      const where: Record<string, unknown> = {};
      if (from) where.startDatetime = { gte: new Date(from) };
      if (to) where.endDatetime = { lte: new Date(to) };
      const events = await prisma.event.findMany({
        where,
        include: { category: true, recurrenceRule: true },
        orderBy: { startDatetime: "asc" },
      });
      return NextResponse.json(events);
    }

    // List mode: filtered + paginated, returns { events, total, page, pageSize }
    const search = searchParams.get("search") ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 25;

    // Build where clause
    type WhereClause = Record<string, unknown>;
    const where: WhereClause = {};

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (dateFrom || dateTo) {
      const dtFilter: Record<string, unknown> = {};
      if (dateFrom) dtFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dtFilter.lte = end;
      }
      where.startDatetime = dtFilter;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: { category: true, recurrenceRule: true },
        orderBy: { startDatetime: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, pageSize });
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
