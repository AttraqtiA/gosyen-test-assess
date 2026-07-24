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
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <p className="eyebrow">Session codes</p>
          <h1 className="mt-2 text-3xl font-semibold">{test.title} sessions</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Generate cohort-specific access codes, control enabled subtests, and share the direct candidate entry link.</p>
        </div>
      </header>
      <SessionCreator 
        testId={test.id} 
        subTests={test.subTests.map((subTest) => ({ id: subTest.id, title: subTest.title }))} 
        initialSessions={test.sessions}
        appUrl={appUrl}
      />
    </main>
  );
}
