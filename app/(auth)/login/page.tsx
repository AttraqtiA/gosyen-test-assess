export default function LoginPage() {
  return (
    <main className="container-page grid min-h-screen content-center py-10">
      <section className="panel mx-auto grid w-full max-w-md gap-4 p-6">
        <h1 className="text-2xl font-semibold">Admin login</h1>
        <p className="text-sm text-slate-600">
          Better Auth routes are mounted at <code>/api/auth/*</code>. In development, dashboard pages fall back to the seeded company admin so the app is testable before production auth wiring is finalized.
        </p>
      </section>
    </main>
  );
}
