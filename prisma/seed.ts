import { AttemptStatus, PrismaClient, QuestionType, Role, TestCategory, type Question, type SubTest, type Test, type TestSession } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { scoreAttempt, type ScoredResponse } from "../lib/scoring";

const prisma = new PrismaClient();

const option = (id: string, label: string, value?: number, dimension?: string) => ({
  id,
  label,
  value,
  dimension,
});

type SeededQuestion = Question & { subTest: SubTest };
type SeededTest = Test & {
  subTests: Array<SubTest & { questions: Question[] }>;
  sessions: TestSession[];
};

function buildScaleAnswers(questions: SeededQuestion[], favoriteDimension: string) {
  return Object.fromEntries(
    questions.map((question) => {
      const value = question.dimension === favoriteDimension ? "5" : question.dimension === "S" ? "3" : "2";
      return [question.id, value];
    }),
  );
}

function buildMcqAnswers(questions: SeededQuestion[], accuracy: number) {
  return Object.fromEntries(
    questions.map((question, index) => {
      const fallback = ["A", "B", "C", "D"][(index + 1) % 4] ?? "A";
      const shouldBeCorrect = index / Math.max(questions.length, 1) < accuracy;
      return [question.id, shouldBeCorrect ? (question.correctAnswer ?? "A") : fallback];
    }),
  );
}

function buildEssayScores(questions: SeededQuestion[], scores: number[]) {
  return Object.fromEntries(
    questions.map((question, index) => [
      question.id,
      {
        answer: `Candidate response for ${question.body.toLowerCase()} with practical examples and outcomes.`,
        llmScore: scores[index] ?? 70,
      },
    ]),
  );
}

async function createScoredAttempt(
  test: SeededTest,
  session: TestSession,
  candidateName: string,
  candidateEmail: string,
  answerFactory: (questions: SeededQuestion[]) => Record<string, string | { answer: string; llmScore?: number; manualScore?: number }>,
  status: AttemptStatus = AttemptStatus.REVIEWED,
) {
  const enabledSubtests = test.subTests.filter((subTest) => session.enabledSubtestIds.includes(subTest.id));
  const questions = enabledSubtests.flatMap((subTest) => subTest.questions.map((question) => ({ ...question, subTest })));
  const rawAnswers = answerFactory(questions);
  const responseInputs = questions.map((question) => {
    const raw = rawAnswers[question.id];
    if (typeof raw === "string") {
      return { questionId: question.id, answer: raw, manualScore: null, llmScore: null, autoScore: null };
    }
    return {
      questionId: question.id,
      answer: raw?.answer ?? "",
      manualScore: raw?.manualScore ?? null,
      llmScore: raw?.llmScore ?? null,
      autoScore: null,
    };
  });

  const scoring = scoreAttempt(test, enabledSubtests, questions, responseInputs);
  const attempt = await prisma.attempt.create({
    data: {
      testId: test.id,
      sessionId: session.id,
      candidateName,
      candidateEmail,
      startedAt: new Date(),
      submittedAt: new Date(),
      status,
    },
  });

  const scoredResponses = new Map(scoring.responses.map((response) => [response.questionId, response] satisfies [string, ScoredResponse]));

  await prisma.response.createMany({
    data: responseInputs.map((response) => {
      const scored = scoredResponses.get(response.questionId);
      const question = questions.find((item) => item.id === response.questionId);
      return {
        attemptId: attempt.id,
        questionId: response.questionId,
        subTestId: question?.subTestId ?? "",
        answer: response.answer,
        autoScore: scored?.autoScore ?? null,
        llmScore: response.llmScore,
        manualScore: response.manualScore,
        finalScore: scored?.finalScore ?? null,
      };
    }),
  });

  await prisma.result.create({
    data: {
      attemptId: attempt.id,
      ...scoring.result,
      reviewedAt: new Date(),
    },
  });

  await prisma.proctoringLog.createMany({
    data: [
      { attemptId: attempt.id, event: "TAB_SWITCH", metadata: { note: "Seeded demo event" } },
      { attemptId: attempt.id, event: "FOCUS_LOSS", metadata: { note: "Seeded demo event" } },
    ],
  });

  await prisma.testSession.update({
    where: { id: session.id },
    data: { useCount: { increment: 1 } },
  });
}

async function createDemoAttempts(companyId: string) {
  const tests = await prisma.test.findMany({
    where: { companyId },
    include: {
      sessions: true,
      subTests: {
        include: { questions: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  const disc = tests.find((test) => test.title === "DISC Personality");
  const logic = tests.find((test) => test.title === "Logic & IQ");
  const ist = tests.find((test) => test.title === "IST Intelligence Battery");
  const interview = tests.find((test) => test.title === "Interview Assessment");

  if (disc && disc.sessions[0]) {
    await createScoredAttempt(disc, disc.sessions[0], "Alya Putri", "alya.putri@example.com", (questions) => buildScaleAnswers(questions, "D"));
    await createScoredAttempt(disc, disc.sessions[0], "Rafi Nugraha", "rafi.nugraha@example.com", (questions) => buildScaleAnswers(questions, "I"));
  }

  if (logic && logic.sessions[0]) {
    await createScoredAttempt(logic, logic.sessions[0], "Nadia Saputra", "nadia.saputra@example.com", (questions) => buildMcqAnswers(questions, 0.8));
    await createScoredAttempt(logic, logic.sessions[0], "Dimas Pratama", "dimas.pratama@example.com", (questions) => buildMcqAnswers(questions, 0.5));
  }

  if (ist) {
    const sessionAll = ist.sessions.find((session) => session.code === "IST001");
    const sessionSelective = ist.sessions.find((session) => session.code === "IST002");
    if (sessionAll) {
      await createScoredAttempt(ist, sessionAll, "Sarah Wijaya", "sarah.wijaya@example.com", (questions) => buildMcqAnswers(questions, 0.84));
      await createScoredAttempt(ist, sessionAll, "Andi Maulana", "andi.maulana@example.com", (questions) => buildMcqAnswers(questions, 0.64));
    }
    if (sessionSelective) {
      await createScoredAttempt(ist, sessionSelective, "Kevin Halim", "kevin.halim@example.com", (questions) => buildMcqAnswers(questions, 0.72));
      await createScoredAttempt(ist, sessionSelective, "Mira Lestari", "mira.lestari@example.com", (questions) => buildMcqAnswers(questions, 0.56));
    }
  }

  if (interview && interview.sessions[0]) {
    await createScoredAttempt(interview, interview.sessions[0], "Citra Maharani", "citra.maharani@example.com", (questions) => buildEssayScores(questions, [88, 84, 91, 85, 90]));
    await createScoredAttempt(interview, interview.sessions[0], "Bagas Ramadhan", "bagas.ramadhan@example.com", (questions) => buildEssayScores(questions, [74, 71, 78, 73, 76]));
  }
}

async function createUsers(companyId: string) {
  const password = await hashPassword("password123");
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@gosyen.com" },
    update: {},
    create: { email: "superadmin@gosyen.com", name: "Super Admin", role: Role.SUPER_ADMIN, companyId },
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@gosyen.com" },
    update: {},
    create: { email: "admin@gosyen.com", name: "Company Admin", role: Role.COMPANY_ADMIN, companyId },
  });
  const corrector = await prisma.user.upsert({
    where: { email: "corrector@gosyen.com" },
    update: {},
    create: { email: "corrector@gosyen.com", name: "Corrector", role: Role.CORRECTOR, companyId },
  });

  for (const user of [superAdmin, admin, corrector]) {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password },
      });
    } else {
      await prisma.account.create({
        data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password,
        },
      });
    }
  }
}

async function createDisc(companyId: string) {
  const test = await prisma.test.create({
    data: {
      companyId,
      title: "DISC Personality",
      description: "Work style preference assessment.",
      category: TestCategory.PERSONALITY,
      scoringConfig: {
        profileMappings: [
          { condition: "D > I && D > S && D > C", label: "High D", description: "Dominant style" },
          { condition: "I > D && I > S && I > C", label: "High I", description: "Influential style" },
          { condition: "S > D && S > I && S > C", label: "High S", description: "Steady style" },
          { condition: "C > D && C > I && C > S", label: "High C", description: "Conscientious style" },
        ],
      },
      subTests: {
        create: {
          title: "DISC Assessment",
          order: 1,
          scoringConfig: { strategy: "sum_by_dimension" },
          questions: {
            create: Array.from({ length: 20 }, (_, index) => {
              const dims = ["D", "I", "S", "C"];
              const dimension = dims[index % dims.length];
              return {
                body: `I tend to show ${dimension}-style behavior in workplace situations ${index + 1}.`,
                type: QuestionType.SCALE,
                order: index + 1,
                options: { min: 1, max: 5, minLabel: "Strongly Disagree", maxLabel: "Strongly Agree" },
                dimension,
                weight: 1,
              };
            }),
          },
        },
      },
    },
    include: { subTests: true },
  });

  await prisma.testSession.create({
    data: {
      testId: test.id,
      code: "DISC01",
      label: "Default DISC session",
      enabledSubtestIds: test.subTests.map((subTest) => subTest.id),
    },
  });
}

async function createLogic(companyId: string) {
  const test = await prisma.test.create({
    data: {
      companyId,
      title: "Logic & IQ",
      description: "Logical reasoning screening test.",
      category: TestCategory.IQ_LOGIC,
      scoringConfig: {},
      subTests: {
        create: {
          title: "Logical Reasoning",
          order: 1,
          scoringConfig: { strategy: "correct_count" },
          questions: {
            create: Array.from({ length: 10 }, (_, index) => ({
              body: `Logical reasoning question ${index + 1}: choose the best answer.`,
              type: QuestionType.MCQ,
              order: index + 1,
              options: [option("A", "Option A"), option("B", "Option B"), option("C", "Option C"), option("D", "Option D")],
              correctAnswer: ["A", "B", "C", "D"][index % 4],
              weight: 1,
            })),
          },
        },
      },
    },
    include: { subTests: true },
  });

  await prisma.testSession.create({
    data: { testId: test.id, code: "IQ0001", label: "Default IQ session", enabledSubtestIds: test.subTests.map((subTest) => subTest.id) },
  });
}

async function createIst(companyId: string) {
  const subtests = [
    ["SE1", "Number Sequences", true],
    ["SE2", "Verbal Analogies", true],
    ["SE3", "Spatial Reasoning", true],
    ["SE4", "Arithmetic", false],
    ["SE5", "Similarities", true],
    ["SE6", "Memory", true],
  ] as const;

  const test = await prisma.test.create({
    data: {
      companyId,
      title: "IST Intelligence Battery",
      description: "Composite intelligence battery with selectable subtests.",
      category: TestCategory.COMPOSITE,
      scoringConfig: { compositeFormula: "SE1 + SE2 + SE3 + SE5 + SE6" },
      subTests: {
        create: subtests.map(([code, title, isEnabled], index) => ({
          title: code,
          description: title,
          order: index + 1,
          isEnabled,
          timeLimitSecs: 600,
          scoringConfig: { strategy: "correct_count" },
          questions: {
            create: Array.from({ length: 10 }, (_, questionIndex) => ({
              body: `${title} question ${questionIndex + 1}.`,
              type: QuestionType.MCQ,
              order: questionIndex + 1,
              options: [option("A", "Option A"), option("B", "Option B"), option("C", "Option C"), option("D", "Option D")],
              correctAnswer: ["A", "B", "C", "D"][questionIndex % 4],
              dimension: code,
              weight: 1,
            })),
          },
        })),
      },
    },
    include: { subTests: true },
  });

  const enabled = test.subTests.filter((subTest) => subTest.isEnabled);
  await prisma.testSession.create({
    data: { testId: test.id, code: "IST001", label: "IST all enabled", enabledSubtestIds: enabled.map((subTest) => subTest.id) },
  });
  await prisma.testSession.create({
    data: {
      testId: test.id,
      code: "IST002",
      label: "IST cohort without SE2",
      enabledSubtestIds: enabled.filter((subTest) => subTest.title !== "SE2").map((subTest) => subTest.id),
    },
  });
}

async function createInterview(companyId: string) {
  const test = await prisma.test.create({
    data: {
      companyId,
      title: "Interview Assessment",
      description: "Structured essay interview assessment.",
      category: TestCategory.INTERVIEW,
      scoringConfig: { autoLlmReview: true },
      subTests: {
        create: {
          title: "Structured Interview",
          order: 1,
          scoringConfig: { strategy: "weighted_sum" },
          questions: {
            create: Array.from({ length: 5 }, (_, index) => ({
              body: `Describe a concrete work example for competency ${index + 1}.`,
              type: QuestionType.ESSAY,
              order: index + 1,
              scoringHint: "Score 0-100 based on specificity, relevance, outcome, and reflection.",
              weight: 1,
            })),
          },
        },
      },
    },
    include: { subTests: true },
  });

  await prisma.testSession.create({
    data: { testId: test.id, code: "INT001", label: "Default interview session", enabledSubtestIds: test.subTests.map((subTest) => subTest.id) },
  });
}

async function main() {
  await prisma.proctoringLog.deleteMany();
  await prisma.response.deleteMany();
  await prisma.result.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.testSession.deleteMany();
  await prisma.question.deleteMany();
  await prisma.subTest.deleteMany();
  await prisma.test.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.member.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  const company = await prisma.company.create({ data: { name: "Gosyen HR", slug: "gosyen" } });
  await createUsers(company.id);
  await createDisc(company.id);
  await createLogic(company.id);
  await createIst(company.id);
  await createInterview(company.id);
  await createDemoAttempts(company.id);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
