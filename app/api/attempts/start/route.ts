import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startAttemptSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = startAttemptSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid start payload." }, { status: 400 });
  }

  const session = await prisma.testSession.findUnique({
    where: { code: payload.data.code.toUpperCase() },
    include: { test: { include: { subTests: { include: { questions: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } } } },
  });

  if (!session || !session.isActive || !session.test.isActive) {
    return NextResponse.json({ error: "Session code is invalid or inactive." }, { status: 404 });
  }
  if (session.expiresAt && session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session has expired." }, { status: 410 });
  }
  if (session.maxUses !== null && session.useCount >= session.maxUses) {
    return NextResponse.json({ error: "Session has reached its maximum uses." }, { status: 409 });
  }

  const attempt = await prisma.attempt.create({
    data: {
      testId: session.testId,
      sessionId: session.id,
      candidateName: payload.data.candidateName,
      candidateEmail: payload.data.candidateEmail,
    },
  });

  await prisma.testSession.update({ where: { id: session.id }, data: { useCount: { increment: 1 } } });

  const enabledSubtests = session.test.subTests.filter((subTest) => session.enabledSubtestIds.includes(subTest.id));
  return NextResponse.json({
    attemptId: attempt.id,
    test: {
      id: session.test.id,
      title: session.test.title,
      description: session.test.description,
      timeLimitMinutes: session.test.timeLimitMinutes,
      showResultsToCandidate: session.test.showResultsToCandidate,
      subTests: enabledSubtests,
    },
  });
}
