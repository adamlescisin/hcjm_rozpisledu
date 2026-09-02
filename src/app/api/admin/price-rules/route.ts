import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth, AdminAuthError } from "@/lib/adminAuth";
import { priceRuleSchema } from "@/lib/validations";

export async function GET() {
  const rules = await prisma.priceRule.findMany({
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth({ allowViewer: false });
    const body = await request.json();
    const data = priceRuleSchema.parse(body);
    const rule = await prisma.priceRule.create({
      data: {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
      },
      include: { category: true },
    });
    return NextResponse.json(rule, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
