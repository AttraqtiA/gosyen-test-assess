import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await params;
  const test = await prisma.test.findFirst({
    where: { id, companyId },
    include: { attempts: { include: { result: true }, orderBy: { startedAt: "desc" } } },
  });
  if (!test) {
    notFound();
  }
  return (
    <main className="container-page grid gap-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{test.title} results</h1>
        <ExportButton kind="batch" testId={test.id} />
      </header>
      <section className="panel overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-100 text-left">
              <th className="p-3">Candidate</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Score</th>
              <th className="p-3">Profile</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {test.attempts.map((attempt) => (
              <tr key={attempt.id} className="border-b">
                <td className="p-3">{attempt.candidateName}</td>
                <td className="p-3">{attempt.candidateEmail}</td>
                <td className="p-3">{attempt.status}</td>
                <td className="p-3">{attempt.result?.totalScore ?? "-"}</td>
                <td className="p-3">{attempt.result?.profileLabel ?? "-"}</td>
                <td className="p-3">
                  <Link className="font-medium text-blue-700" href={`/dashboard/attempts/${attempt.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
