import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportAttemptWorkbook } from "@/lib/export";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await context.params;
  const attempt = await prisma.attempt.findFirst({
    where: { id, test: { companyId } },
    include: {
      test: true,
      result: true,
      responses: { include: { question: true, subTest: true }, orderBy: { question: { order: "asc" } } },
      proctoringLogs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  const buffer = await exportAttemptWorkbook(attempt);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="attempt-${attempt.id}.xlsx"`,
    },
  });
}
