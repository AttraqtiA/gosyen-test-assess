import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { startAttemptSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.toUpperCase();

  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Invalid session code." }, { status: 400 });
  }

  const session = await prisma.testSession.findUnique({
    where: { code },
    include: {
      test: {
        include: {
          subTests: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!session || !session.isActive || !session.test.isActive) {
    return NextResponse.json({ error: "Session not found or inactive." }, { status: 404 });
  }

  // Extract positions from subtests starting with "Studi Kasus - "
  const positions: string[] = [];
  const enabledSubtestIds = session.enabledSubtestIds as string[] ?? [];
  const enabledSubtests = session.test.subTests.filter((s) => enabledSubtestIds.includes(s.id));

  enabledSubtests.forEach((subTest) => {
    if (subTest.title.startsWith("Studi Kasus - ")) {
      const positionName = subTest.title.replace("Studi Kasus - ", "").trim();
      if (positionName && !positions.includes(positionName)) {
        positions.push(positionName);
      }
    }
  });

  return NextResponse.json({
    testTitle: session.test.title,
    testDescription: session.test.description,
    positions,
  });
}

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

  const selectedPosition = payload.data.position;

  const attempt = await prisma.attempt.create({
    data: {
      testId: session.testId,
      sessionId: session.id,
      candidateName: payload.data.candidateName?.trim() || `Anonymous ${session.code}`,
      candidateEmail: payload.data.candidateEmail?.trim() || `${session.code.toLowerCase()}-${randomUUID().slice(0, 8)}@local.gosyen`,
      position: selectedPosition || null,
    },
  });

  await prisma.testSession.update({ where: { id: session.id }, data: { useCount: { increment: 1 } } });

  // Filter: Keep all general subtests + ONLY the specific case study matching the selected position
  const enabledSubtestIds = session.enabledSubtestIds as string[] ?? [];
  const enabledSubtests = session.test.subTests.filter((subTest) => {
    if (!enabledSubtestIds.includes(subTest.id)) return false;
    
    if (subTest.title.startsWith("Studi Kasus - ")) {
      const positionName = subTest.title.replace("Studi Kasus - ", "").trim();
      return positionName === selectedPosition;
    }
    return true;
  });

  return NextResponse.json({
    attemptId: attempt.id,
    test: {
      id: session.test.id,
      title: session.test.title,
      description: session.test.description,
      timeLimitMinutes: session.test.timeLimitMinutes,
      showResultsToCandidate: session.test.showResultsToCandidate,
      candidateFields: session.test.candidateFields,
      proctoringConfig: (session.test.scoringConfig as any)?.proctoringConfig,
      subTests: enabledSubtests,
    },
  });
}
