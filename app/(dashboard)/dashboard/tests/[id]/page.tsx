import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
    <main className="container-page grid gap-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{test.title}</h1>
          <p className="text-sm text-slate-600">{test.description}</p>
        </div>
        <div className="flex gap-3 text-sm font-medium text-blue-700">
          <Link href={`/dashboard/tests/${test.id}/edit`}>Edit</Link>
          <Link href={`/dashboard/tests/${test.id}/sessions`}>Sessions</Link>
          <Link href={`/dashboard/tests/${test.id}/results`}>Results</Link>
        </div>
      </header>
      <section className="grid gap-3">
        {test.subTests.map((subTest) => (
          <article key={subTest.id} className="panel p-4">
            <h2 className="font-semibold">{subTest.title}</h2>
            <p className="text-sm text-slate-600">{subTest.questions.length} questions</p>
          </article>
        ))}
      </section>
    </main>
  );
}
