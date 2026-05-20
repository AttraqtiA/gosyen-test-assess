"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProctoringEvent } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/test-taking/ProgressBar";
import { QuestionCard, type CandidateQuestion } from "@/components/test-taking/QuestionCard";
import { Timer } from "@/components/test-taking/Timer";
import { ViolationBanner } from "@/components/test-taking/ViolationBanner";
import { useTestStore } from "@/lib/store";

type CandidateSubtest = {
  id: string;
  title: string;
  description: string | null;
  timeLimitSecs: number | null;
  questions: CandidateQuestion[];
};

type ActiveTest = {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  showResultsToCandidate: boolean;
  subTests: CandidateSubtest[];
};

function TakePageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [test, setTest] = useState<ActiveTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const store = useTestStore();

  const questions = useMemo(() => test?.subTests.flatMap((subTest) => subTest.questions.map((question) => ({ ...question, subTestTitle: subTest.title }))) ?? [], [test]);
  const currentQuestion = questions[store.currentQuestionIndex];

  async function start() {
    setError(null);
    const response = await fetch("/api/attempts/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, candidateName, candidateEmail }),
    });
    const data = (await response.json()) as { attemptId?: string; test?: ActiveTest; error?: string };
    if (!response.ok || !data.attemptId || !data.test) {
      setError(data.error ?? "Could not start assessment.");
      return;
    }
    store.setAttempt(data.attemptId);
    setTest(data.test);
    await document.documentElement.requestFullscreen().catch(() => undefined);
  }

  const submit = useCallback(async () => {
    await store.submit();
    if (test?.showResultsToCandidate && store.attemptId) {
      router.push(`/results/${store.attemptId}`);
    }
  }, [router, store, test?.showResultsToCandidate]);

  useEffect(() => {
    if (!store.attemptId || !test) {
      return;
    }
    const log = async (event: ProctoringEvent) => {
      store.addViolation(event);
      await fetch("/api/proctor/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId: store.attemptId, event }),
      }).catch(() => undefined);
    };
    const visibility = () => {
      if (document.hidden) {
        void log("TAB_SWITCH");
      }
    };
    const blur = () => void log("FOCUS_LOSS");
    const fullscreen = () => {
      if (!document.fullscreenElement) {
        void log("FULLSCREEN_EXIT");
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    document.addEventListener("fullscreenchange", fullscreen);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      document.removeEventListener("fullscreenchange", fullscreen);
    };
  }, [store, store.attemptId, test]);

  if (!test) {
    return (
      <main className="container-page grid min-h-screen content-center py-10">
        <section className="panel mx-auto grid w-full max-w-xl gap-4 p-6">
          <h1 className="text-2xl font-semibold">Start assessment</h1>
          <Input placeholder="Session code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
          <Input placeholder="Full name" value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
          <Input placeholder="Email" type="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={start}>Begin</Button>
        </section>
      </main>
    );
  }

  if (store.isSubmitted) {
    return (
      <main className="container-page grid min-h-screen content-center py-10">
        <section className="panel mx-auto max-w-xl p-6 text-center">
          <h1 className="text-2xl font-semibold">Submission received</h1>
          <p className="mt-2 text-sm text-slate-600">Your responses have been saved.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container-page grid gap-5 py-6">
      <header className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h1 className="text-xl font-semibold">{test.title}</h1>
          {currentQuestion && <p className="text-sm text-slate-600">{currentQuestion.subTestTitle}</p>}
        </div>
        <Timer seconds={test.timeLimitMinutes ? test.timeLimitMinutes * 60 : null} onExpire={submit} />
      </header>
      <ViolationBanner count={store.violations.length} />
      <ProgressBar current={Math.min(store.currentQuestionIndex + 1, questions.length)} total={questions.length} />
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          value={store.answers[currentQuestion.id] ?? ""}
          onChange={(value) => store.setAnswer(currentQuestion.id, value)}
        />
      )}
      <footer className="flex justify-between gap-3">
        <Button variant="secondary" onClick={store.prevQuestion} disabled={store.currentQuestionIndex === 0}>
          Previous
        </Button>
        {store.currentQuestionIndex >= questions.length - 1 ? (
          <Button onClick={submit}>Submit</Button>
        ) : (
          <Button onClick={store.nextQuestion}>Next</Button>
        )}
      </footer>
    </main>
  );
}

export default function TakePage() {
  return (
    <Suspense fallback={<main className="container-page py-10 text-sm text-slate-600">Loading assessment...</main>}>
      <TakePageContent />
    </Suspense>
  );
}
