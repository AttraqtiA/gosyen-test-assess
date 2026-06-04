export default function LoginPage() {
  return (
    <main className="subtle-grid grid min-h-screen content-center py-10">
      <section className="container-page grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="max-w-2xl">
          <p className="eyebrow">Gosyen operations</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Assessment command center</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Manage tests, candidate sessions, scoring review, and Excel exports from one tenant-scoped dashboard.
          </p>
        </div>
        <div className="panel grid gap-5 p-6">
          <div>
            <h2 className="text-xl font-semibold">Admin access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Better Auth routes are mounted at <code>/api/auth/*</code>. Development mode falls back to the seeded company admin so the dashboard remains testable locally.
            </p>
          </div>
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="font-semibold text-slate-900">Seeded local accounts</div>
            <div className="grid gap-1 text-slate-600">
              <span>Admin: admin@gosyen.com</span>
              <span>Reviewer: corrector@gosyen.com</span>
              <span>Super admin: superadmin@gosyen.com</span>
              <span>Password: password123</span>
            </div>
          </div>
          <a href="/dashboard" className="button-primary">
            Open dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
