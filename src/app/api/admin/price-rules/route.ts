import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { priceRuleSchema } from "@/lib/validations";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function GET() {
  const rules = await prisma.priceRule.findMany({
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Chyba serveru";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
