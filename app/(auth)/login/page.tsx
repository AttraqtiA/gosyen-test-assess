import { PasswordField } from "@/components/auth/PasswordField";

export default function LoginPage() {
  return (
    <main className="container-page page-stack">
      <section className="hero-panel">
        <div className="hero-content lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="hero-copy">
            <p className="eyebrow">Gosyen operations</p>
            <h1 className="hero-title">Create exams, publish codes, and monitor results from one place.</h1>
            <p className="hero-body">
              The admin side is built around test creation, cohort-specific session codes, and result review. It is meant to feel closer to a modern exam command center than a generic CRUD panel.
            </p>
          </div>
          <div className="panel grid gap-5 p-6 md:p-8">
            <div>
              <h2 className="text-2xl font-semibold">Admin access</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Enter your organization credentials to manage tests, sessions, reviews, and exports.
              </p>
            </div>
            <form className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
              Email address
              <input
                className="input-shell"
                name="email"
                type="email"
                autoComplete="email"
              />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
              Password
              <PasswordField />
            </label>
            </form>
            <a href="/dashboard" className="button-primary">
              Open dashboard
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
