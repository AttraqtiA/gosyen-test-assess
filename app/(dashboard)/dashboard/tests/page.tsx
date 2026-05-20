import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function TestsPage() {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const tests = await prisma.test.findMany({
    where: { companyId },
    include: { sessions: true, attempts: true, subTests: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container-page grid gap-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <Link href="/dashboard/tests/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          New test
        </Link>
      </header>
      <section className="grid gap-3">
        {tests.map((test) => (
          <article key={test.id} className="panel grid gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{test.title}</h2>
                <p className="text-sm text-slate-600">{test.category}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{test.isActive ? "Active" : "Draft"}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>{test.subTests.length} subtests</span>
              <span>{test.sessions.length} sessions</span>
              <span>{test.attempts.length} attempts</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-blue-700">
              <Link href={`/dashboard/tests/${test.id}`}>Overview</Link>
              <Link href={`/dashboard/tests/${test.id}/edit`}>Edit</Link>
              <Link href={`/dashboard/tests/${test.id}/sessions`}>Sessions</Link>
              <Link href={`/dashboard/tests/${test.id}/results`}>Results</Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
