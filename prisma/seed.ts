import { PrismaClient, QuestionType, Role, TestCategory } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const option = (id: string, label: string, value?: number, dimension?: string) => ({
  id,
  label,
  value,
  dimension,
});

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
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
