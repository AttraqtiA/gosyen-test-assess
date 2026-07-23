import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResultsPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ sort?: string; q?: string }>;
};

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const sort = query.sort === "asc" ? "asc" : "desc";
  const filter = query.q?.trim().toLowerCase() ?? "";
  const test = await prisma.test.findFirst({
    where: { id, companyId },
    include: { attempts: { include: { result: true }, orderBy: { startedAt: "desc" } } },
  });
  if (!test) {
    notFound();
  }
  return (
    <main className="container-page page-stack">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Results workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">{test.title} results</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form className="flex flex-wrap items-center gap-3" action="">
            <input type="hidden" name="sort" value={sort} />
            <Input name="q" defaultValue={filter} placeholder="Filter by candidate, email, or profile" className="w-72" />
            <select name="sort" defaultValue={sort} className="select-shell w-40">
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
            <Button type="submit" variant="secondary">Apply</Button>
          </form>
          <ExportButton kind="batch" testId={test.id} />
        </div>
      </header>
      <section className="panel table-shell overflow-x-auto">
        {test.attempts.length === 0 ? (
          <div className="empty-state p-8">
            <h2 className="text-2xl font-semibold">No candidate submissions yet</h2>
            <p>Generate a session code, let a candidate submit, or reseed demo data to see scored attempts here.</p>
          </div>
        ) : (
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
            {test.attempts
              .filter((attempt) => {
                if (!filter) {
                  return true;
                }
                const haystack = [attempt.candidateName, attempt.candidateEmail, attempt.result?.profileLabel ?? ""].join(" ").toLowerCase();
                return haystack.includes(filter);
              })
              .sort((left, right) => {
                const leftTime = left.submittedAt?.getTime() ?? left.startedAt.getTime();
                const rightTime = right.submittedAt?.getTime() ?? right.startedAt.getTime();
                return sort === "asc" ? leftTime - rightTime : rightTime - leftTime;
              })
              .map((attempt) => (
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
        )}
      </section>
    </main>
  );
}
