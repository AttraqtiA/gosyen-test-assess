import { NextResponse } from "next/server";
import { runLlmReview } from "@/lib/llm-review";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await context.params;
  const attempt = await prisma.attempt.findFirst({ where: { id, test: { companyId } }, select: { id: true } });
  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  await runLlmReview(id);
  return NextResponse.json({ ok: true });
}
