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
    <main className="container-page grid gap-5 py-8">
      <header>
        <h1 className="text-2xl font-semibold">{test.title} sessions</h1>
        <p className="text-sm text-slate-600">Create cohort-specific session codes and choose enabled subtests.</p>
      </header>
      <SessionCreator testId={test.id} subTests={test.subTests.map((subTest) => ({ id: subTest.id, title: subTest.title }))} />
      <section className="grid gap-3">
        {test.sessions.map((session) => (
          <article key={session.id} className="panel grid gap-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-2xl font-semibold">{session.code}</div>
                <p className="text-sm text-slate-600">{session.label ?? "Untitled session"}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{session.useCount}{session.maxUses ? ` / ${session.maxUses}` : ""} uses</span>
            </div>
            <p className="text-sm text-slate-600">{appUrl}/take/{session.code}</p>
            <p className="text-xs text-slate-500">Enabled: {test.subTests.filter((subTest) => session.enabledSubtestIds.includes(subTest.id)).map((subTest) => subTest.title).join(", ")}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
