import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

const payloadSchema = z.object({ manualScore: z.number().min(0) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser([Role.CORRECTOR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN]);
  const companyId = scopedCompanyId(user);
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid score payload." }, { status: 400 });
  }
  const { id } = await context.params;
  const response = await prisma.response.findFirst({
    where: { id, attempt: { test: { companyId } } },
    select: { id: true, attemptId: true, llmScore: true, autoScore: true },
  });
  if (!response) {
    return NextResponse.json({ error: "Response not found." }, { status: 404 });
  }

  await prisma.response.update({
    where: { id },
    data: { manualScore: payload.data.manualScore, finalScore: payload.data.manualScore ?? response.llmScore ?? response.autoScore },
  });
  const scores = await prisma.response.findMany({ where: { attemptId: response.attemptId }, select: { finalScore: true } });
  const totalScore = scores.reduce((sum, item) => sum + (item.finalScore ?? 0), 0);
  await prisma.result.update({ where: { attemptId: response.attemptId }, data: { totalScore, reviewedBy: user.id, reviewedAt: new Date() } });

  return NextResponse.json({ ok: true, totalScore });
}
