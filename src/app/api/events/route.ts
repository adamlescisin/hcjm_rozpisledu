import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoryId = searchParams.get("categoryId");

  if (!from || !to) {
    return NextResponse.json({ error: "Chybí parametry from/to" }, { status: 400 });
  }

  const fromDate = startOfDay(new Date(from));
  const toDate = endOfDay(new Date(to));

  const where: Record<string, unknown> = {
    startDatetime: { gte: fromDate },
    endDatetime: { lte: toDate },
    status: { not: "CANCELLED" },
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: { startDatetime: "asc" },
  });

  return NextResponse.json(events);
}
