import Link from "next/link";

export default function CandidateLanding() {
  return (
    <main className="container-page grid min-h-screen content-center py-10">
      <section className="panel mx-auto grid w-full max-w-xl gap-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Gosyen Assess</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your session code to start an assessment.</p>
        </div>
        <Link href="/take" className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white">
          Start assessment
        </Link>
      </section>
    </main>
  );
}
