import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

const payloadSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await context.params;
  const payload = payloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid test payload." }, { status: 400 });
  }

  const test = await prisma.test.findFirst({
    where: { id, companyId },
    select: { id: true, isActive: true },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  const updated = await prisma.test.update({
    where: { id: test.id },
    data: { isActive: payload.data.isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json(updated);
}
