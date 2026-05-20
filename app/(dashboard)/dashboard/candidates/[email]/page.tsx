import { prisma } from "@/lib/prisma";
import { requireDashboardUser, scopedCompanyId } from "@/lib/auth";

export default async function CandidateProfilePage({ params }: { params: Promise<{ email: string }> }) {
  const user = await requireDashboardUser();
  const companyId = scopedCompanyId(user);
  const { email } = await params;
  const candidateEmail = decodeURIComponent(email);
  const [attempts, profiles] = await Promise.all([
    prisma.attempt.findMany({
      where: { candidateEmail, test: { companyId } },
      include: { test: true, result: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.candidateProfile.findMany({ where: { companyId, candidateEmail }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <main className="container-page grid gap-5 py-8">
      <header>
        <h1 className="text-2xl font-semibold">{candidateEmail}</h1>
        <p className="text-sm text-slate-600">Composite candidate profile</p>
      </header>
      <section className="grid gap-3">
        {attempts.map((attempt) => (
          <article key={attempt.id} className="panel p-4">
            <h2 className="font-semibold">{attempt.test.title}</h2>
            <p className="text-sm text-slate-600">Score: {attempt.result?.totalScore ?? "-"} - {attempt.result?.profileLabel ?? "No profile"}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Composite profiles</h2>
        {profiles.map((profile) => (
          <article key={profile.id} className="panel p-4">
            <h3 className="font-semibold">{profile.label}</h3>
            <p className="text-sm text-slate-600">Composite score: {profile.compositeScore ?? "-"}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
