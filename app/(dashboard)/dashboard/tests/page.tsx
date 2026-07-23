import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TestStatusToggle } from "@/components/dashboard/TestStatusToggle";
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
    <main className="container-page page-stack">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Assessment library</p>
          <h1 className="mt-2 text-3xl font-semibold">Tests</h1>
        </div>
        <Link href="/dashboard/tests/new" className="button-primary">
          New test
        </Link>
      </header>
      <section className="grid gap-3">
        {tests.map((test) => (
          <article key={test.id} className="panel grid gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{test.title}</h2>
                <p className="text-sm text-[var(--muted)]">{test.category}</p>
              </div>
              <span className={`status-pill ${test.isActive ? "status-pill--active" : "status-pill--inactive"}`}>{test.isActive ? "Active" : "Passive"}</span>
            </div>
            <p className="text-sm leading-7 text-[var(--muted)]">{test.description ?? "No summary yet. Open the test to define its structure, scoring model, and code cohorts."}</p>
            <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
              <span>{test.subTests.length} subtests</span>
              <span>{test.sessions.length} sessions</span>
              <span>{test.attempts.length} attempts</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TestStatusToggle testId={test.id} isActive={test.isActive} />
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-[var(--primary)]">
                <Link href={`/dashboard/tests/${test.id}`}>Overview</Link>
                <Link href={`/dashboard/tests/${test.id}/edit`}>Edit</Link>
                <Link href={`/dashboard/tests/${test.id}/sessions`}>Sessions</Link>
                <Link href={`/dashboard/tests/${test.id}/results`}>Results</Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
