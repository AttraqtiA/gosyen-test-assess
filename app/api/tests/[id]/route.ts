import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

const questionSchema = z.object({
  id: z.string().optional(),
  body: z.string(),
  type: z.enum(["MCQ", "ESSAY", "SCALE", "RANKING", "TRUE_FALSE", "OPEN"]),
  order: z.number(),
  options: z.any().nullable(),
  correctAnswer: z.string().nullable().optional(),
  weight: z.number().default(1.0),
  dimension: z.string().nullable().optional(),
  scoringHint: z.string().nullable().optional(),
});

const subTestSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  order: z.number(),
  timeLimitSecs: z.number().nullable().optional(),
  isEnabled: z.boolean().default(true),
  scoringConfig: z.any(),
  questions: z.array(questionSchema),
});

const testUpdateSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  category: z.enum(["PERSONALITY", "IQ_LOGIC", "INTERVIEW", "KAHOOT", "COMPOSITE", "CUSTOM"]),
  timeLimitMinutes: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  shuffleQuestions: z.boolean().default(false),
  showResultsToCandidate: z.boolean().default(false),
  passingThreshold: z.number().nullable().optional(),
  scoringConfig: z.any(),
  subTests: z.array(subTestSchema),
});

const toggleSchema = z.object({
  isActive: z.boolean(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await context.params;

  const test = await prisma.test.findFirst({
    where: { id, companyId },
    include: {
      subTests: {
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  return NextResponse.json(test);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await context.params;
  const payload = toggleSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid toggle payload." }, { status: 400 });
  }

  const test = await prisma.test.findFirst({
    where: { id, companyId },
    select: { id: true },
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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await context.params;
  
  const payload = testUpdateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid test data schema.", details: payload.error.flatten() }, { status: 400 });
  }

  const existingTest = await prisma.test.findFirst({
    where: { id, companyId },
  });

  if (!existingTest) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  const data = payload.data;

  try {
    const updatedTest = await prisma.$transaction(async (tx) => {
      // 1. Update Test metadata
      await tx.test.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          timeLimitMinutes: data.timeLimitMinutes,
          isActive: data.isActive,
          shuffleQuestions: data.shuffleQuestions,
          showResultsToCandidate: data.showResultsToCandidate,
          passingThreshold: data.passingThreshold,
          scoringConfig: data.scoringConfig ?? {},
        },
      });

      // 2. Fetch current subtests & questions in DB to see what to delete
      const dbSubTests = await tx.subTest.findMany({
        where: { testId: id },
        include: { questions: true },
      });

      const incomingSubTestIds = data.subTests.map((s) => s.id).filter(Boolean) as string[];
      const subTestsToDelete = dbSubTests.filter((s) => !incomingSubTestIds.includes(s.id));

      // Delete removed subtests and their questions
      for (const subTest of subTestsToDelete) {
        await tx.question.deleteMany({ where: { subTestId: subTest.id } });
        await tx.subTest.delete({ where: { id: subTest.id } });
      }

      // 3. Upsert subtests and questions
      for (const subTestData of data.subTests) {
        let subTestId = subTestData.id;

        if (subTestId) {
          // Update existing SubTest
          await tx.subTest.update({
            where: { id: subTestId },
            data: {
              title: subTestData.title,
              description: subTestData.description,
              order: subTestData.order,
              timeLimitSecs: subTestData.timeLimitSecs,
              isEnabled: subTestData.isEnabled,
              scoringConfig: subTestData.scoringConfig ?? {},
            },
          });
        } else {
          // Create new SubTest
          const newSubTest = await tx.subTest.create({
            data: {
              testId: id,
              title: subTestData.title,
              description: subTestData.description,
              order: subTestData.order,
              timeLimitSecs: subTestData.timeLimitSecs,
              isEnabled: subTestData.isEnabled,
              scoringConfig: subTestData.scoringConfig ?? {},
            },
          });
          subTestId = newSubTest.id;
        }

        // Questions within this SubTest
        const dbQuestions = dbSubTests.find((s) => s.id === subTestId)?.questions ?? [];
        const incomingQuestionIds = subTestData.questions.map((q) => q.id).filter(Boolean) as string[];
        const questionsToDelete = dbQuestions.filter((q) => !incomingQuestionIds.includes(q.id));

        // Delete removed questions
        if (questionsToDelete.length > 0) {
          await tx.question.deleteMany({
            where: { id: { in: questionsToDelete.map((q) => q.id) } },
          });
        }

        // Upsert incoming questions
        for (const qData of subTestData.questions) {
          if (qData.id) {
            await tx.question.update({
              where: { id: qData.id },
              data: {
                body: qData.body,
                type: qData.type,
                order: qData.order,
                options: qData.options ?? null,
                correctAnswer: qData.correctAnswer ?? null,
                weight: qData.weight,
                dimension: qData.dimension ?? null,
                scoringHint: qData.scoringHint ?? null,
              },
            });
          } else {
            await tx.question.create({
              data: {
                subTestId: subTestId,
                body: qData.body,
                type: qData.type,
                order: qData.order,
                options: qData.options ?? null,
                correctAnswer: qData.correctAnswer ?? null,
                weight: qData.weight,
                dimension: qData.dimension ?? null,
                scoringHint: qData.scoringHint ?? null,
              },
            });
          }
        }
      }

      // Re-fetch final test config
      return await tx.test.findUnique({
        where: { id },
        include: { subTests: { include: { questions: true } } },
      });
    });

    return NextResponse.json(updatedTest);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update test.", details: err.message }, { status: 500 });
  }
}
