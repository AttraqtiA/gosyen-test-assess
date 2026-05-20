import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

const payloadSchema = z.object({
  candidateEmail: z.string().email(),
  attemptIds: z.array(z.string()).min(1),
  label: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
  }
  const attempts = await prisma.attempt.findMany({
    where: { id: { in: payload.data.attemptIds }, candidateEmail: payload.data.candidateEmail, test: { companyId } },
    include: { result: true },
  });
  const scores = attempts.map((attempt) => attempt.result?.totalScore).filter((score): score is number => score !== null && score !== undefined);
  const compositeScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  const profile = await prisma.candidateProfile.create({
    data: {
      companyId,
      candidateEmail: payload.data.candidateEmail,
      attemptIds: attempts.map((attempt) => attempt.id),
      label: payload.data.label,
      compositeScore,
    },
  });
  return NextResponse.json(profile);
}
