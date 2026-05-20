import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await params;
  const attempt = await prisma.attempt.findFirst({
    where: { id, test: { companyId } },
    include: { test: true, result: true, responses: { include: { question: true, subTest: true }, orderBy: { question: { order: "asc" } } }, proctoringLogs: true },
  });
  if (!attempt) {
    notFound();
  }
  return (
    <main className="container-page grid gap-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{attempt.candidateName}</h1>
          <p className="text-sm text-slate-600">{attempt.test.title} - {attempt.candidateEmail}</p>
        </div>
        <ExportButton kind="attempt" attemptId={attempt.id} />
      </header>
      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-sm text-slate-500">Total score</div>
          <div className="text-3xl font-semibold">{attempt.result?.totalScore ?? "-"}</div>
        </div>
        <div className="panel p-4">
          <div className="text-sm text-slate-500">Profile</div>
          <div className="text-xl font-semibold">{attempt.result?.profileLabel ?? "-"}</div>
        </div>
        <div className="panel p-4">
          <div className="text-sm text-slate-500">Violations</div>
          <div className="text-3xl font-semibold">{attempt.proctoringLogs.length}</div>
        </div>
      </section>
      <section className="grid gap-3">
        {attempt.responses.map((response) => (
          <article key={response.id} className="panel grid gap-2 p-4">
            <div className="text-xs uppercase text-slate-500">{response.subTest.title} - {response.question.type}</div>
            <h2 className="font-semibold">{response.question.body}</h2>
            <p className="text-sm text-slate-700">{response.answer}</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>Auto: {response.autoScore ?? "-"}</span>
              <span>LLM: {response.llmScore ?? "-"}</span>
              <span>Manual: {response.manualScore ?? "-"}</span>
              <span>Final: {response.finalScore ?? "-"}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
