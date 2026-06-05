import Link from "next/link";

export default function CandidateLanding() {
  return (
    <main className="container-page page-stack">
      <section className="hero-panel">
        <div className="hero-content lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="hero-copy">
            <p className="eyebrow">Candidate assessment portal</p>
            <h1 className="hero-title">Blue-themed exam entry built for code-based access.</h1>
            <p className="hero-body">
              Think fast join flow, organized question delivery, and proctor-aware sessions. Candidates enter a code, start the exam, and move through subtests without dashboard clutter.
            </p>
            <div className="hero-actions">
              <Link href="/take" className="button-primary">
                Join with code
              </Link>
              <Link href="/login" className="button-secondary">
                Admin login
              </Link>
            </div>
          </div>
          <div className="hero-grid">
            <div className="mockup-grid">
              <article className="mockup-card mockup-card--tall">
                <div className="mockup-toolbar">
                  <span className="mockup-dots"><span /><span /><span /></span>
                  <span>Candidate workspace</span>
                </div>
                <div className="surface-block p-4">
                  <p className="eyebrow">Live session</p>
                  <h2 className="mt-2 text-2xl font-semibold">Enter code and begin</h2>
                  <div className="mt-4 grid gap-3">
                    <div className="surface-block p-4">
                      <div className="text-sm text-[var(--muted)]">Session code</div>
                      <div className="mt-2 font-display text-3xl font-semibold tracking-[0.24em]">IST002</div>
                    </div>
                    <div className="mockup-strip">
                      <span />
                      <span className="w-4/5" />
                      <span className="w-2/3" />
                    </div>
                  </div>
                </div>
                <div className="mockup-kpi">
                  <div className="metric-card">
                    <strong>6</strong>
                    <small>Subtests live</small>
                  </div>
                  <div className="metric-card">
                    <strong>2</strong>
                    <small>Code cohorts</small>
                  </div>
                </div>
              </article>
              <div className="grid gap-4">
                <article className="mockup-card">
                  <p className="eyebrow">Admin flow</p>
                  <h3 className="text-xl font-semibold">Create exam, generate code, invite assessee.</h3>
                  <p className="text-sm leading-7 text-[var(--muted)]">Session codes stay tied to enabled subtests, so different cohorts can sit different batteries from the same master test.</p>
                </article>
                <article className="mockup-card">
                  <p className="eyebrow">Review loop</p>
                  <h3 className="text-xl font-semibold">Auto scoring plus manual correction where needed.</h3>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
