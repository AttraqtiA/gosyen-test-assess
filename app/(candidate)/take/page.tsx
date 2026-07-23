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
  const [test, setTest] = useState<ActiveTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const store = useTestStore();

  // Multi-step start form states
  const [sessionVerified, setSessionVerified] = useState(false);
  const [testInfo, setTestInfo] = useState<{ testTitle: string; testDescription: string | null; positions: string[] } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");

  const questions = useMemo(() => test?.subTests.flatMap((subTest) => subTest.questions.map((question) => ({ ...question, subTestTitle: subTest.title }))) ?? [], [test]);
  const currentQuestion = questions[store.currentQuestionIndex];

  // Auto-verify session if code is present in URL query
  useEffect(() => {
    const codeParam = params.get("code");
    if (codeParam && codeParam.length === 6) {
      setCode(codeParam.toUpperCase());
      const verify = async (sessionCode: string) => {
        setError(null);
        setLoading(true);
        try {
          const res = await fetch(`/api/attempts/start?code=${sessionCode}`);
          const data = await res.json();
          if (res.ok) {
            setTestInfo(data);
            setSessionVerified(true);
            if (data.positions && data.positions.length > 0) {
              setSelectedPosition(data.positions[0]);
            }
          } else {
            setError(data.error ?? "Invalid session code.");
          }
        } catch (err) {
          setError("Failed to verify session.");
        } finally {
          setLoading(false);
        }
      };
      void verify(codeParam.toUpperCase());
    }
  }, [params]);

  async function verifySession() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/attempts/start?code=${code}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Invalid session code.");
        return;
      }
      setTestInfo(data);
      setSessionVerified(true);
      if (data.positions && data.positions.length > 0) {
        setSelectedPosition(data.positions[0]);
      }
    } catch (err) {
      setError("Failed to verify session.");
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    setError(null);
    setLoading(true);
    const response = await fetch("/api/attempts/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        candidateName: name,
        candidateEmail: email,
        position: selectedPosition,
      }),
    });
    const data = (await response.json()) as { attemptId?: string; test?: ActiveTest; error?: string };
    setLoading(false);
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
      <main className="container-page page-stack">
        <section className="hero-panel">
          <div className="hero-content lg:grid-cols-[1fr_420px] lg:items-center">
            <div className="hero-copy">
              <p className="eyebrow">Masuk dengan kode</p>
              <h1 className="hero-title">Masukkan kode ujian dan mulai sesi.</h1>
              <p className="hero-body">Silakan masukkan kode sesi ujian Anda, isi nama lengkap, alamat email, dan pilih posisi pekerjaan yang Anda lamar.</p>
            </div>
            <div className="panel grid gap-4 p-6">
              <h2 className="text-2xl font-semibold">Start assessment</h2>
              
              {!sessionVerified ? (
                <>
                  <Input 
                    placeholder="Session code" 
                    value={code} 
                    onChange={(event) => setCode(event.target.value.toUpperCase())} 
                    maxLength={6}
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button onClick={verifySession} disabled={code.length !== 6 || loading}>
                    {loading ? "Verifying..." : "Verify Code"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-sm text-[var(--muted)] mb-2">
                    <span className="font-semibold text-[var(--foreground)]">Ujian:</span> {testInfo?.testTitle}
                  </div>
                  <Input 
                    placeholder="Nama Lengkap" 
                    value={name} 
                    onChange={(event) => setName(event.target.value)} 
                  />
                  <Input 
                    placeholder="Email" 
                    type="email"
                    value={email} 
                    onChange={(event) => setEmail(event.target.value)} 
                  />
                  
                  {testInfo?.positions && testInfo.positions.length > 0 && (
                    <div className="grid gap-1">
                      <label className="text-xs font-semibold text-[var(--muted)]">Posisi yang Dilamar</label>
                      <select 
                        value={selectedPosition} 
                        onChange={(e) => setSelectedPosition(e.target.value)}
                        className="select-shell h-10 text-sm"
                      >
                        {testInfo.positions.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setSessionVerified(false)} disabled={loading}>
                      Back
                    </Button>
                    <Button onClick={start} disabled={!name || !email || loading} className="flex-1">
                      {loading ? "Starting..." : "Begin"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (store.isSubmitted) {
    return (
      <main className="container-page grid min-h-screen content-center py-10">
        <section className="panel mx-auto max-w-xl p-8 text-center grid gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Submission received</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Your responses have been saved.</p>
          </div>
          <div className="flex justify-center mt-2">
            <Button onClick={() => { window.location.href = "/take"; }} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
              Kembali ke Beranda
            </Button>
          </div>
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
