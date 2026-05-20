import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { QuestionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

export async function runLlmReview(attemptId: string) {
  await prisma.attempt.update({ where: { id: attemptId }, data: { status: "UNDER_REVIEW" } });
  const attempt = await prisma.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { responses: { include: { question: true } } },
  });

  for (const response of attempt.responses) {
    if (response.question.type !== QuestionType.ESSAY && response.question.type !== QuestionType.OPEN) {
      continue;
    }

    const result = process.env.ANTHROPIC_API_KEY
      ? await generateObject({
          model: anthropic("claude-3-5-sonnet-latest"),
          schema: reviewSchema,
          prompt: [
            `Question: ${response.question.body}`,
            `Rubric: ${response.question.scoringHint ?? "Score 0-100 based on answer quality."}`,
            `Candidate answer: ${response.answer}`,
          ].join("\n\n"),
        }).then((output) => output.object)
      : { score: 0, feedback: "LLM review skipped because ANTHROPIC_API_KEY is not configured.", confidence: "low" as const };

    await prisma.response.update({
      where: { id: response.id },
      data: {
        llmScore: result.score,
        llmFeedback: result.feedback,
        llmConfidence: result.confidence,
        finalScore: response.manualScore ?? result.score ?? response.autoScore,
      },
    });
  }

  const scores = await prisma.response.findMany({ where: { attemptId }, select: { finalScore: true } });
  const totalScore = scores.reduce((sum, response) => sum + (response.finalScore ?? 0), 0);
  await prisma.result.update({ where: { attemptId }, data: { totalScore } });
  await prisma.attempt.update({ where: { id: attemptId }, data: { status: "REVIEWED" } });
}
