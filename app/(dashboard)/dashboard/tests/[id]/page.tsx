import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TestStatusToggle } from "@/components/dashboard/TestStatusToggle";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await params;
  const test = await prisma.test.findFirst({
    where: { id, companyId },
    include: { subTests: { include: { questions: true }, orderBy: { order: "asc" } }, sessions: true },
  });
  if (!test) {
    notFound();
  }
  return (
    <main className="container-page page-stack">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Test detail</p>
          <h1 className="mt-2 text-3xl font-semibold">{test.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">{test.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TestStatusToggle testId={test.id} isActive={test.isActive} />
          <div className="flex gap-3 text-sm font-semibold text-[var(--primary)]">
          <Link href={`/dashboard/tests/${test.id}/edit`}>Edit</Link>
          <Link href={`/dashboard/tests/${test.id}/sessions`}>Sessions</Link>
          <Link href={`/dashboard/tests/${test.id}/results`}>Results</Link>
          </div>
        </div>
      </header>
      <section className="grid gap-3">
        {test.subTests.map((subTest) => (
          <article key={subTest.id} className="panel p-4">
            <h2 className="font-semibold">{subTest.title}</h2>
            <p className="text-sm text-[var(--muted)]">{subTest.questions.length} questions</p>
          </article>
        ))}
      </section>
    </main>
  );
}
