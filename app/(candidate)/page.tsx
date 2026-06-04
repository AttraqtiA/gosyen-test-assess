import Link from "next/link";

export default function CandidateLanding() {
  return (
    <main className="subtle-grid grid min-h-screen content-center py-10">
      <section className="container-page grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="max-w-2xl">
          <p className="eyebrow">Candidate assessment portal</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">Gosyen Assess</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            A focused, secure test-taking experience for structured hiring assessments, logic tests, interviews, and personality profiles.
          </p>
        </div>
        <div className="panel grid gap-5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Start your assessment</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use the session code provided by your assessment administrator.</p>
          </div>
          <Link href="/take" className="button-primary">
            Enter session code
          </Link>
          <Link href="/login" className="button-secondary">
            Administrator login
          </Link>
        </div>
      </section>
    </main>
  );
}
