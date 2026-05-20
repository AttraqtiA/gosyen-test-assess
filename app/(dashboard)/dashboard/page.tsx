import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const [tests, attempts, reviews] = await Promise.all([
    prisma.test.count({ where: { companyId } }),
    prisma.attempt.count({ where: { test: { companyId } } }),
    prisma.attempt.count({ where: { test: { companyId }, status: "UNDER_REVIEW" } }),
  ]);

  return (
    <main className="container-page grid gap-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>
        <Link href="/dashboard/tests/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          New test
        </Link>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Tests", tests],
          ["Attempts", attempts],
          ["Under review", reviews],
        ].map(([label, value]) => (
          <div key={label} className="panel p-5">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>
      <nav className="panel grid gap-2 p-4 text-sm">
        <Link href="/dashboard/tests">Tests</Link>
        <Link href="/dashboard/corrector">Manual review queue</Link>
      </nav>
    </main>
  );
}
