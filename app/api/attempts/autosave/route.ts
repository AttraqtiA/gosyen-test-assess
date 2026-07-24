import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { answerPayloadSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = answerPayloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid autosave payload." }, { status: 400 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: payload.data.attemptId },
    include: {
      test: { include: { subTests: { include: { questions: true } } } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  // Find questions to map subtest id
  const questions = attempt.test.subTests.flatMap((st) => st.questions);

  // We simply upsert each answer into Response table, but leave autoScore/finalScore as null
  // because actual scoring happens at submit.
  const responsesToUpsert = Object.entries(payload.data.answers).map(([questionId, answer]) => {
    const q = questions.find((item) => item.id === questionId);
    return {
      attemptId: attempt.id,
      questionId,
      subTestId: q?.subTestId ?? "",
      answer,
    };
  });

  await prisma.$transaction(async (tx) => {
    // Delete existing responses for this attempt
    await tx.response.deleteMany({ where: { attemptId: attempt.id } });
    
    // Create new responses
    await tx.response.createMany({
      data: responsesToUpsert
    });
  });

  return NextResponse.json({ ok: true });
}
