import { NextResponse } from "next/server";
import { QuestionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scoreAttempt } from "@/lib/scoring";
import { answerPayloadSchema } from "@/lib/validation";
import { scoringConfigSchema } from "@/lib/validation";
import { runLlmReview } from "@/lib/llm-review";

export async function POST(request: Request) {
  const payload = answerPayloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid submission payload." }, { status: 400 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: payload.data.attemptId },
    include: {
      test: { include: { subTests: { include: { questions: true }, orderBy: { order: "asc" } } } },
      session: true,
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const sessionEnabledIds = attempt.session?.enabledSubtestIds as string[] ?? [];
  const enabledSubtests = attempt.test.subTests.filter((subTest) => {
    if (attempt.session && !sessionEnabledIds.includes(subTest.id)) {
      return false;
    }
    if (!attempt.session && !subTest.isEnabled) {
      return false;
    }
    if (subTest.title.startsWith("Studi Kasus - ")) {
      const positionName = subTest.title.replace("Studi Kasus - ", "").trim();
      return positionName === attempt.position;
    }
    return true;
  });
  const questions = enabledSubtests.flatMap((subTest) => subTest.questions.map((question) => ({ ...question, subTest })));
  const responseInputs = questions
    .filter((question) => payload.data.answers[question.id] !== undefined)
    .map((question) => ({
      questionId: question.id,
      answer: payload.data.answers[question.id],
      manualScore: null,
      llmScore: null,
      autoScore: null,
    }));
  const scoring = scoreAttempt(attempt.test, enabledSubtests, questions, responseInputs);

  await prisma.$transaction(async (tx) => {
    await tx.response.deleteMany({ where: { attemptId: attempt.id } });
    await tx.response.createMany({
      data: responseInputs.map((response) => {
        const question = questions.find((item) => item.id === response.questionId);
        const scored = scoring.responses.find((item) => item.questionId === response.questionId);
        return {
          attemptId: attempt.id,
          questionId: response.questionId,
          subTestId: question?.subTestId ?? "",
          answer: response.answer,
          autoScore: scored?.autoScore ?? null,
          finalScore: scored?.finalScore ?? null,
        };
      }),
    });
    await tx.result.upsert({
      where: { attemptId: attempt.id },
      update: scoring.result,
      create: { attemptId: attempt.id, ...scoring.result },
    });
    const hasPendingReview = questions.some((question) => question.type === QuestionType.ESSAY || question.type === QuestionType.OPEN);
    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        submittedAt: new Date(),
        status: hasPendingReview ? "UNDER_REVIEW" : "REVIEWED",
      },
    });
  });

  const config = scoringConfigSchema.parse(attempt.test.scoringConfig);
  if (config.autoLlmReview) {
    await runLlmReview(attempt.id);
  }

  return NextResponse.json({ attemptId: attempt.id, result: scoring.result });
}
