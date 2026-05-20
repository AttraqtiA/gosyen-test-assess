import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function CorrectorPage() {
  const user = await requireDashboardUser([Role.CORRECTOR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN]);
  const companyId = scopedCompanyId(user);
  const attempts = await prisma.attempt.findMany({
    where: { test: { companyId }, status: "UNDER_REVIEW" },
    include: { test: true, result: true },
    orderBy: { startedAt: "asc" },
  });
  return (
    <main className="container-page grid gap-5 py-8">
      <h1 className="text-2xl font-semibold">Manual review queue</h1>
      <section className="grid gap-3">
        {attempts.map((attempt) => (
          <article key={attempt.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="font-semibold">{attempt.candidateName}</h2>
              <p className="text-sm text-slate-600">{attempt.test.title} - {attempt.candidateEmail}</p>
            </div>
            <Link href={`/dashboard/attempts/${attempt.id}`} className="font-medium text-blue-700">
              Review
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
