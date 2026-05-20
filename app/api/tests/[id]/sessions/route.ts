import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";
import { generateSessionCode } from "@/lib/session-code";

const payloadSchema = z.object({
  label: z.string().optional(),
  expiresAt: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  enabledSubtestIds: z.array(z.string()).min(1),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await context.params;
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid session payload." }, { status: 400 });
  }
  const test = await prisma.test.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!test) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  let code = generateSessionCode();
  for (let index = 0; index < 5; index += 1) {
    const existing = await prisma.testSession.findUnique({ where: { code } });
    if (!existing) {
      break;
    }
    code = generateSessionCode();
  }

  const session = await prisma.testSession.create({
    data: {
      testId: test.id,
      code,
      label: payload.data.label,
      maxUses: payload.data.maxUses,
      expiresAt: payload.data.expiresAt ? new Date(payload.data.expiresAt) : null,
      enabledSubtestIds: payload.data.enabledSubtestIds,
    },
  });
  return NextResponse.json(session);
}
