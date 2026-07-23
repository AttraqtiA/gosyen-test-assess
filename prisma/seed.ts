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

function buildMcqAnswers(questions: SeededQuestion[], accuracy: number) {
  return Object.fromEntries(
    questions.map((question, index) => {
      const fallback = ["A", "B", "C", "D"][(index + 1) % 4] ?? "A";
      const shouldBeCorrect = index / Math.max(questions.length, 1) < accuracy;
      return [question.id, shouldBeCorrect ? (question.correctAnswer ?? "A") : fallback];
    }),
  );
}

async function createScoredAttempt(
  test: Omit<SeededTest, "sessions">,
  session: TestSession,
  candidateName: string,
  candidateEmail: string,
  position: string,
  accuracy: number,
  essayAnswers: Record<string, string>,
  status: AttemptStatus = AttemptStatus.REVIEWED,
) {
  // Filter subtests based on general IST + matching case study
  const enabledSubtests = test.subTests.filter((subTest) => {
    // Keep generic IST subtests
    if (!subTest.title.startsWith("Studi Kasus - ")) {
      return true;
    }
    // Only keep matching position case study
    return subTest.title === `Studi Kasus - ${position}`;
  });

  const questions = enabledSubtests.flatMap((subTest) =>
    subTest.questions.map((question) => ({ ...question, subTest }))
  );

  const rawAnswers: Record<string, string | { answer: string; llmScore?: number }> = {};
  
  // Fill MCQ answers
  const mcqQuestions = questions.filter(q => q.type === QuestionType.MCQ);
  const mcqAns = buildMcqAnswers(mcqQuestions, accuracy);
  Object.assign(rawAnswers, mcqAns);

  // Fill Essay answers
  const essayQuestions = questions.filter(q => q.type === QuestionType.ESSAY);
  essayQuestions.forEach(q => {
    rawAnswers[q.id] = {
      answer: essayAnswers[q.body] ?? `Jawaban kandidat untuk ${q.body}`,
      llmScore: 80,
    };
  });

  const responseInputs = questions.map((question) => {
    const raw = rawAnswers[question.id];
    if (typeof raw === "string") {
      return { questionId: question.id, answer: raw, manualScore: null, llmScore: null, autoScore: null };
    }
    return {
      questionId: question.id,
      answer: raw?.answer ?? "",
      manualScore: null,
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
      position,
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

  await prisma.testSession.update({
    where: { id: session.id },
    data: { useCount: { increment: 1 } },
  });
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

async function createIstAndCaseStudy(companyId: string) {
  const test = await prisma.test.create({
    data: {
      companyId,
      title: "IST & Studi Kasus",
      description: "Tes inteligensi IST (pilihan ganda) yang menyambung langsung dengan Studi Kasus (essay) sesuai posisi pelamar.",
      category: TestCategory.COMPOSITE,
      scoringConfig: {
        compositeFormula: "SE1 + SE2 + SE3 + SE5 + SE6",
      },
      subTests: {
        create: [
          // Generic IST Subtests (MCQ)
          {
            title: "SE1 - Verbal Analogies",
            description: "Menemukan hubungan kata.",
            order: 1,
            timeLimitSecs: 600,
            scoringConfig: { strategy: "correct_count" },
            questions: {
              create: Array.from({ length: 5 }, (_, idx) => ({
                body: `Hubungan kata analogi ke-${idx + 1}: pilih yang paling tepat.`,
                type: QuestionType.MCQ,
                order: idx + 1,
                options: [option("A", "Pilihan A"), option("B", "Pilihan B"), option("C", "Pilihan C"), option("D", "Pilihan D")],
                correctAnswer: ["A", "B", "C", "D"][idx % 4],
                dimension: "SE1",
                weight: 1,
              })),
            },
          },
          {
            title: "SE2 - Number Sequences",
            description: "Melanjutkan deret angka.",
            order: 2,
            timeLimitSecs: 600,
            scoringConfig: { strategy: "correct_count" },
            questions: {
              create: Array.from({ length: 5 }, (_, idx) => ({
                body: `Deret angka: ${2 + idx * 3}, ${5 + idx * 3}, ${8 + idx * 3}, ... Berapakah angka selanjutnya?`,
                type: QuestionType.MCQ,
                order: idx + 1,
                options: [option("A", `${11 + idx * 3}`), option("B", `${12 + idx * 3}`), option("C", `${10 + idx * 3}`), option("D", `${13 + idx * 3}`)],
                correctAnswer: "A",
                dimension: "SE2",
                weight: 1,
              })),
            },
          },
          {
            title: "SE3 - Spatial Reasoning",
            description: "Kemampuan ruang dan visual spasial.",
            order: 3,
            timeLimitSecs: 600,
            scoringConfig: { strategy: "correct_count" },
            questions: {
              create: Array.from({ length: 5 }, (_, idx) => ({
                body: `Spasial visualisasi ke-${idx + 1}: Manakah kubus hasil rotasi gambar di atas?`,
                type: QuestionType.MCQ,
                order: idx + 1,
                options: [option("A", "Gambar A"), option("B", "Gambar B"), option("C", "Gambar C"), option("D", "Gambar D")],
                correctAnswer: ["A", "B", "C", "D"][idx % 4],
                dimension: "SE3",
                weight: 1,
              })),
            },
          },
          {
            title: "SE5 - Similarities",
            description: "Menemukan kesamaan kata.",
            order: 4,
            timeLimitSecs: 600,
            scoringConfig: { strategy: "correct_count" },
            questions: {
              create: Array.from({ length: 5 }, (_, idx) => ({
                body: `Manakah kata yang paling mirip maknanya dengan kata ke-${idx + 1}?`,
                type: QuestionType.MCQ,
                order: idx + 1,
                options: [option("A", "Opsi A"), option("B", "Opsi B"), option("C", "Opsi C"), option("D", "Opsi D")],
                correctAnswer: ["A", "B", "C", "D"][idx % 4],
                dimension: "SE5",
                weight: 1,
              })),
            },
          },
          {
            title: "SE6 - Memory",
            description: "Tes ingatan kata dan visual.",
            order: 5,
            timeLimitSecs: 600,
            scoringConfig: { strategy: "correct_count" },
            questions: {
              create: Array.from({ length: 5 }, (_, idx) => ({
                body: `Apakah kata ke-${idx + 1} terdapat dalam daftar hafalan sebelumnya?`,
                type: QuestionType.MCQ,
                order: idx + 1,
                options: [option("A", "Ya"), option("B", "Tidak")],
                correctAnswer: "A",
                dimension: "SE6",
                weight: 1,
              })),
            },
          },
          // Case Studies (Essay) - Dynamically selected by position in start API
          {
            title: "Studi Kasus - Marketing",
            description: "Uji studi kasus kompetensi pemasaran.",
            order: 6,
            timeLimitSecs: 1800, // 30 minutes
            scoringConfig: { strategy: "weighted_sum" },
            questions: {
              create: [
                {
                  body: "Sebagai Marketing Manager, bagaimana Anda merancang strategi digital marketing untuk produk B2B SaaS baru dengan budget terbatas?",
                  type: QuestionType.ESSAY,
                  order: 1,
                  scoringHint: "Nilai berdasarkan kejelasan strategi, pemilihan kanal berbayar vs organik, dan KPI yang realistis.",
                  weight: 1,
                },
                {
                  body: "Jelaskan langkah-langkah penanganan krisis PR jika produk utama perusahaan mengalami kebocoran data pelanggan.",
                  type: QuestionType.ESSAY,
                  order: 2,
                  scoringHint: "Nilai berdasarkan kecepatan merespon, empati dalam komunikasi, dan rencana mitigasi teknis.",
                  weight: 1,
                }
              ]
            }
          },
          {
            title: "Studi Kasus - Programmer",
            description: "Uji studi kasus kompetensi pemrograman dan arsitektur perangkat lunak.",
            order: 7,
            timeLimitSecs: 1800,
            scoringConfig: { strategy: "weighted_sum" },
            questions: {
              create: [
                {
                  body: "Bagaimana Anda mengoptimalkan kueri database SQL yang lambat pada tabel transaksi yang memiliki jutaan baris data?",
                  type: QuestionType.ESSAY,
                  order: 1,
                  scoringHint: "Nilai berdasarkan pemahaman tentang indeks, analisis execution plan (EXPLAIN), partition, dan caching.",
                  weight: 1,
                },
                {
                  body: "Jelaskan perbedaan arsitektur Monolith vs Microservices. Kapan sebaiknya kita mulai memigrasikan sistem monolith ke microservices?",
                  type: QuestionType.ESSAY,
                  order: 2,
                  scoringHint: "Nilai berdasarkan pemahaman trade-off overhead komunikasi jaringan, batas domain konteks, dan kompleksitas deployment.",
                  weight: 1,
                }
              ]
            }
          }
        ],
      },
    },
    include: { subTests: { include: { questions: true } } },
  });

  const session = await prisma.testSession.create({
    data: {
      testId: test.id,
      code: "ISTCS1",
      label: "Sesi Ujian IST + Studi Kasus",
      enabledSubtestIds: test.subTests.map((s) => s.id), // Enable all so dynamic filter can run
    },
  });

  // Create Seed attempts
  await createScoredAttempt(
    test,
    session,
    "Rafi Nugraha",
    "rafi.nugraha@example.com",
    "Marketing",
    0.8,
    {
      "Sebagai Marketing Manager, bagaimana Anda merancang strategi digital marketing untuk produk B2B SaaS baru dengan budget terbatas?":
        "Fokus pada SEO konten, pemasaran inbound melalui artikel edukatif di LinkedIn, serta memanfaatkan uji coba gratis (freemium) untuk mengakuisisi pengguna awal secara organik.",
      "Jelaskan langkah-langkah penanganan krisis PR jika produk utama perusahaan mengalami kebocoran data pelanggan.":
        "Pertama, akui masalah dalam 2 jam pertama. Rilis pernyataan maaf, tutup celah keamanan, dan tawarkan kompensasi pemantauan kredit gratis kepada korban kebocoran."
    }
  );

  await createScoredAttempt(
    test,
    session,
    "Sarah Wijaya",
    "sarah.wijaya@example.com",
    "Programmer",
    0.9,
    {
      "Bagaimana Anda mengoptimalkan kueri database SQL yang lambat pada tabel transaksi yang memiliki jutaan baris data?":
        "Membuat indeks pada kolom filter (WHERE), menghindari SELECT *, mengoptimalkan JOIN, menggunakan redis untuk data yang sering diakses, dan menerapkan database partitioning.",
      "Jelaskan perbedaan arsitektur Monolith vs Microservices. Kapan sebaiknya kita mulai memigrasikan sistem monolith ke microservices?":
        "Monolith menggabungkan semua modul dalam satu codebase. Microservices memisahkannya ke service independen. Migrasi dilakukan saat skalabilitas tim terhambat dan service tertentu butuh scaling ekstrim."
    }
  );
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
  await createIstAndCaseStudy(company.id);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
