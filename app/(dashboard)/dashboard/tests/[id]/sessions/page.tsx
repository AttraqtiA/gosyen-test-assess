import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SessionCreator } from "@/components/dashboard/SessionCreator";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function SessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await params;
  const test = await prisma.test.findFirst({
    where: { id, companyId },
    include: { subTests: { orderBy: { order: "asc" } }, sessions: { orderBy: { createdAt: "desc" } } },
  });
  if (!test) {
    notFound();
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return (
    <main className="container-page page-stack">
      <header>
        <p className="eyebrow">Session codes</p>
        <h1 className="mt-2 text-3xl font-semibold">{test.title} sessions</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Generate cohort-specific access codes, control enabled subtests, and share the direct candidate entry link.</p>
      </header>
      <SessionCreator testId={test.id} subTests={test.subTests.map((subTest) => ({ id: subTest.id, title: subTest.title }))} />
      <section className="grid gap-3">
        {test.sessions.map((session) => (
          <article key={session.id} className="panel grid gap-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-display font-mono text-2xl font-semibold">{session.code}</div>
                <p className="text-sm text-[var(--muted)]">{session.label ?? "Untitled session"}</p>
              </div>
              <span className="status-pill status-pill--inactive">{session.useCount}{session.maxUses ? ` / ${session.maxUses}` : ""} uses</span>
            </div>
            <p className="text-sm text-[var(--muted)]">{appUrl}/take?code={session.code}</p>
            <p className="text-xs text-[var(--muted)]">Enabled: {test.subTests.filter((subTest) => session.enabledSubtestIds.includes(subTest.id)).map((subTest) => subTest.title).join(", ")}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
