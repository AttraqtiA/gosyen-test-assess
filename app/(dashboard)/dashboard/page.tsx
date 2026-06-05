import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, scopedCompanyId } from "@/lib/auth";
import { redirect } from "next/navigation";

function isDatabaseInitializationError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === "PrismaClientInitializationError" ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("Authentication failed against database server")
  );
}

function DatabaseSetupPage() {
  return (
    <main className="container-page grid min-h-screen content-center py-10">
      <section className="panel mx-auto grid w-full max-w-2xl gap-5 p-6">
        <div>
          <p className="eyebrow">Local database setup</p>
          <h1 className="mt-2 text-3xl font-semibold">Connect the dashboard to the project database</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The dashboard needs PostgreSQL at <code>localhost:5433</code>. Start Docker Desktop, then run the database and seed commands below.
          </p>
        </div>
        <div className="grid gap-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
          <code>docker compose up -d db minio</code>
          <code>npm run prisma:migrate -- --name init</code>
          <code>npm run prisma:seed</code>
        </div>
        <Link href="/login" className="button-secondary justify-start">
          Back to login
        </Link>
      </section>
    </main>
  );
}

export default async function DashboardPage() {
  let data;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect("/login");
    }
    const companyId = scopedCompanyId(user);
    const [tests, attempts, reviews] = await Promise.all([
      prisma.test.count({ where: { companyId } }),
      prisma.attempt.count({ where: { test: { companyId } } }),
      prisma.attempt.count({ where: { test: { companyId }, status: "UNDER_REVIEW" } }),
    ]);
    data = { user, tests, attempts, reviews };
  } catch (error: unknown) {
    if (isDatabaseInitializationError(error)) {
      return <DatabaseSetupPage />;
    }
    throw error;
  }

  const { user, tests, attempts, reviews } = data;

  return (
    <main className="container-page page-stack">
      <section className="hero-panel">
        <div className="hero-content lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="hero-copy">
            <p className="eyebrow">Company workspace</p>
            <h1 className="hero-title">Run assessment operations with live codes, active tests, and review queues.</h1>
            <p className="hero-body">
              Your seeded demo data is now wired through the full stack, so the dashboard can show real attempts instead of empty placeholders.
            </p>
            <div className="hero-actions">
              <Link href="/dashboard/tests/new" className="button-primary">
                Create new exam
              </Link>
              <Link href="/dashboard/tests" className="button-secondary">
                Browse tests
              </Link>
            </div>
          </div>
          <div className="mockup-grid">
            <article className="mockup-card">
              <div className="mockup-toolbar">
                <span>{user.email}</span>
                <span>Tenant scoped</span>
              </div>
              <div className="mockup-kpi">
                <div className="metric-card">
                  <strong>{tests}</strong>
                  <small>Tests</small>
                </div>
                <div className="metric-card">
                  <strong>{attempts}</strong>
                  <small>Attempts</small>
                </div>
                <div className="metric-card">
                  <strong>{reviews}</strong>
                  <small>Under review</small>
                </div>
                <div className="metric-card">
                  <strong>2</strong>
                  <small>Seeded cohorts</small>
                </div>
              </div>
            </article>
            <article className="mockup-card">
              <p className="eyebrow">Admin shortcuts</p>
              <div className="grid gap-3">
                <Link className="button-secondary justify-start" href="/dashboard/tests">Open Tests</Link>
                <Link className="button-secondary justify-start" href="/dashboard/corrector">Manual review queue</Link>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="dashboard-grid md:grid-cols-3">
        {[
          ["Tests", tests],
          ["Attempts", attempts],
          ["Under review", reviews],
        ].map(([label, value]) => (
          <div key={label} className="panel stat-card dashboard-card">
            <div className="text-sm text-[var(--muted)]">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>
      <nav className="panel grid gap-3 p-4 text-sm md:grid-cols-2">
        <Link className="button-secondary justify-start" href="/dashboard/tests">Tests</Link>
        <Link className="button-secondary justify-start" href="/dashboard/corrector">Manual review queue</Link>
      </nav>
    </main>
  );
}
