import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { jsonObject } from "@/lib/scoring";

export default async function CandidateResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const result = await prisma.result.findUnique({
    where: { attemptId },
    include: { attempt: { include: { test: true } } },
  });
  if (!result || !result.attempt.test.showResultsToCandidate) {
    notFound();
  }
  return (
    <main className="container-page grid min-h-screen content-center py-10">
      <section className="panel mx-auto grid w-full max-w-2xl gap-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold">{result.attempt.test.title}</h1>
          <p className="text-sm text-slate-600">{result.attempt.candidateName}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-slate-200 p-4">
            <div className="text-xs uppercase text-slate-500">Total score</div>
            <div className="text-3xl font-semibold">{result.totalScore ?? "Pending"}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <div className="text-xs uppercase text-slate-500">Profile</div>
            <div className="text-xl font-semibold">{result.profileLabel ?? "Pending"}</div>
          </div>
        </div>
        <div className="grid gap-2">
          {Object.entries(jsonObject(result.subtestScores)).map(([key, value]) => (
            <div key={key} className="flex justify-between border-b border-slate-100 py-2 text-sm">
              <span>{key}</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
