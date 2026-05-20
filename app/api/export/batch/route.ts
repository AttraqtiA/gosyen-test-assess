import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exportBatchWorkbook } from "@/lib/export";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

const payloadSchema = z.object({ testId: z.string(), sessionId: z.string().optional() });

export async function POST(request: Request) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid export payload." }, { status: 400 });
  }
  const attempts = await prisma.attempt.findMany({
    where: {
      testId: payload.data.testId,
      sessionId: payload.data.sessionId,
      test: { companyId },
      submittedAt: { not: null },
    },
    include: {
      test: true,
      result: true,
      responses: { include: { question: true, subTest: true }, orderBy: { question: { order: "asc" } } },
      proctoringLogs: true,
    },
    orderBy: { submittedAt: "desc" },
  });
  const buffer = await exportBatchWorkbook(attempts);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="batch-${payload.data.testId}.xlsx"`,
    },
  });
}
