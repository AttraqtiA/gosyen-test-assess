import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await context.params;
  const result = await prisma.result.findUnique({
    where: { attemptId },
    include: { attempt: { select: { candidateName: true, candidateEmail: true, test: { select: { title: true, showResultsToCandidate: true } } } } },
  });
  if (!result || !result.attempt.test.showResultsToCandidate) {
    return NextResponse.json({ error: "Result not available." }, { status: 404 });
  }
  return NextResponse.json(result);
}
