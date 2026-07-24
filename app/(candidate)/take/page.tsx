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
  proctoringConfig?: { freezeOnTabSwitch?: boolean; freezeDurationSecs?: number };
  subTests: CandidateSubtest[];
};

function TakePageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [test, setTest] = useState<ActiveTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [freezeRemainingSecs, setFreezeRemainingSecs] = useState(0);
  const store = useTestStore();

  // Multi-step start form states
  const [sessionVerified, setSessionVerified] = useState(false);
  const [testInfo, setTestInfo] = useState<{ testTitle: string; testDescription: string | null; positions: string[] } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [viewingSubtestInstructions, setViewingSubtestInstructions] = useState(true);

  const questions = useMemo(() => test?.subTests.flatMap((subTest) => subTest.questions.map((question) => ({ ...question, subTestId: subTest.id, subTestTitle: subTest.title }))) ?? [], [test]);
  const currentQuestion = questions[store.currentQuestionIndex];

  const currentSubtest = useMemo(() => {
    if (!currentQuestion || !test) {
      return null;
    }
    return test.subTests.find((st) => st.id === currentQuestion.subTestId) ?? null;
  }, [currentQuestion, test]);

  // Auto-display instructions on subtest change if descriptions exist
  useEffect(() => {
    if (currentSubtest) {
      if (currentSubtest.description && currentSubtest.description.trim() !== "") {
        setViewingSubtestInstructions(true);
      } else {
        setViewingSubtestInstructions(false);
      }
    }
  }, [currentSubtest]);

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

  const handleSubtestExpire = useCallback(() => {
    if (!test || !currentSubtest) {
      return;
    }
    const currentIndex = test.subTests.findIndex((st) => st.id === currentSubtest.id);
    const nextSubtest = test.subTests[currentIndex + 1];
    if (nextSubtest) {
      const nextQIndex = questions.findIndex((q) => q.subTestId === nextSubtest.id);
      if (nextQIndex !== -1) {
        store.goToQuestionIndex(nextQIndex);
        return;
      }
    }
    void submit();
  }, [test, currentSubtest, questions, submit, store]);

  const timerSeconds = test?.timeLimitMinutes 
    ? test.timeLimitMinutes * 60 
    : currentSubtest?.timeLimitSecs ?? null;

  const timerExpire = test?.timeLimitMinutes 
    ? submit 
    : handleSubtestExpire;

  const timerKey = test?.timeLimitMinutes 
    ? `global-${test.id}` 
    : currentSubtest 
      ? `subtest-${currentSubtest.id}` 
      : "none";

  const currentSubtestQuestions = useMemo(() => {
    if (!currentSubtest) return [];
    return questions.filter((q) => q.subTestId === currentSubtest.id);
  }, [currentSubtest, questions]);

  const currentQuestionIndexInSubtest = useMemo(() => {
    if (!currentQuestion) return 0;
    return currentSubtestQuestions.findIndex((q) => q.id === currentQuestion.id);
  }, [currentQuestion, currentSubtestQuestions]);

  const goToNextSubtest = useCallback(() => {
    if (!test || !currentSubtest) return;
    const currentIndex = test.subTests.findIndex((st) => st.id === currentSubtest.id);
    const nextSubtest = test.subTests[currentIndex + 1];
    if (nextSubtest) {
      const nextQIndex = questions.findIndex((q) => q.subTestId === nextSubtest.id);
      if (nextQIndex !== -1) {
        store.goToQuestionIndex(nextQIndex);
      }
    }
  }, [test, currentSubtest, questions, store]);

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
      
      if (event === "TAB_SWITCH" && test.proctoringConfig?.freezeOnTabSwitch) {
        setFreezeRemainingSecs(test.proctoringConfig.freezeDurationSecs ?? 10);
        
        // Play beep sound
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
          
          gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + 1);
        } catch (e) {
          console.error("Audio playback failed", e);
        }
      }
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

  useEffect(() => {
    if (freezeRemainingSecs > 0) {
      const timer = setInterval(() => {
        setFreezeRemainingSecs((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [freezeRemainingSecs]);

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
              ) : showRules ? (
                <>
                  <div className="grid gap-4">
                    <div className="text-sm text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">Ujian:</span> {testInfo?.testTitle}
                    </div>

                    <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] text-xs text-[var(--foreground)] flex flex-col gap-2 max-h-60 overflow-y-auto leading-relaxed">
                      <p className="font-bold text-sm text-[var(--primary)] mb-1">Peraturan & Petunjuk Pengerjaan:</p>
                      <ol className="list-decimal pl-4 flex flex-col gap-2">
                        <li><strong>Batas Waktu:</strong> Ujian memiliki batas waktu pengerjaan per sub-tes. Batas waktu akan mulai dihitung mundur ketika Anda mengeklik tombol <strong>Mulai Ujian</strong>.</li>
                        <li><strong>Mode Layar Penuh (Fullscreen):</strong> Ujian wajib dikerjakan dalam mode layar penuh. Sistem akan memicu mode layar penuh otomatis.</li>
                        <li><strong>Sistem Keamanan & Proktor:</strong> Sistem proktor otomatis akan mencatat pelanggaran jika Anda melakukan:
                          <ul className="list-disc pl-4 mt-1 flex flex-col gap-1 text-[var(--muted)]">
                            <li>Berpindah ke tab atau membuka jendela aplikasi lain (Tab Switch).</li>
                            <li>Mengurangi fokus jendela browser (Focus Loss).</li>
                            <li>Keluar dari mode layar penuh (Fullscreen Exit).</li>
                          </ul>
                        </li>
                        <li><strong>Penyimpanan Otomatis:</strong> Seluruh jawaban Anda disimpan secara otomatis di sistem kami.</li>
                      </ol>
                    </div>

                    <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] cursor-pointer hover:bg-[var(--surface-soft)]/80 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={agreedToRules} 
                        onChange={(e) => setAgreedToRules(e.target.checked)} 
                        className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <span className="text-xs text-[var(--foreground)] font-medium leading-tight">
                        Saya telah membaca, memahami, dan menyetujui seluruh peraturan pengerjaan ujian di atas.
                      </span>
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowRules(false)} disabled={loading}>
                      Kembali
                    </Button>
                    <Button onClick={start} disabled={!agreedToRules || loading} className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
                      {loading ? "Memulai..." : "Mulai Ujian"}
                    </Button>
                  </div>
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
                    <Button onClick={() => setShowRules(true)} disabled={!name || !email || loading} className="flex-1">
                      Lanjut
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

  if (viewingSubtestInstructions && currentSubtest?.description && currentSubtest.description.trim() !== "") {
    return (
      <main className="container-page grid gap-5 py-6">
        <header className="panel flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <h1 className="text-xl font-semibold">{test.title}</h1>
            <p className="text-sm text-[var(--muted)]">{currentSubtest.title}</p>
          </div>
          {currentSubtest.timeLimitSecs && (
            <span className="text-sm font-semibold text-[var(--muted)]">
              Waktu: {Math.floor(currentSubtest.timeLimitSecs / 60)} menit
            </span>
          )}
        </header>

        <section className="panel p-8 flex flex-col gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h2 className="text-lg font-bold text-[var(--primary)] mb-4">Petunjuk & Contoh Pengerjaan Sub-Tes:</h2>
            <div 
              className="text-sm text-[var(--foreground)] leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{ __html: currentSubtest.description }}
            />
          </div>
        </section>

        <footer className="flex justify-end mt-2">
          <Button 
            onClick={() => setViewingSubtestInstructions(false)} 
            className="bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] px-8 py-5 text-md font-semibold"
          >
            Mulai Sub-Tes
          </Button>
        </footer>
      </main>
    );
  }

  return (
    <>
      {freezeRemainingSecs > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center backdrop-blur-md">
          <div className="bg-[var(--danger)]/20 p-8 rounded-2xl border border-[var(--danger)] max-w-md">
            <h2 className="text-3xl font-bold text-[var(--danger)] mb-4">PELANGGARAN TERDETEKSI</h2>
            <p className="text-lg mb-6">Anda telah berpindah tab atau keluar dari halaman ujian. Sebagai sanksi, layar ujian dibekukan.</p>
            <div className="text-6xl font-black tabular-nums">{freezeRemainingSecs}</div>
            <p className="mt-4 text-sm text-[var(--muted)]">Ujian dapat dilanjutkan setelah waktu habis.</p>
          </div>
        </div>
      )}
      <main className="container-page grid gap-5 py-6">
        <header className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h1 className="text-xl font-semibold">{test.title}</h1>
          {currentQuestion && <p className="text-sm text-[var(--muted)]">{currentQuestion.subTestTitle}</p>}
        </div>
        <Timer key={timerKey} seconds={timerSeconds} onExpire={timerExpire} />
      </header>
      <ViolationBanner count={store.violations.length} />
      <ProgressBar current={currentQuestionIndexInSubtest + 1} total={currentSubtestQuestions.length} />
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          value={store.answers[currentQuestion.id] ?? ""}
          onChange={(value) => store.setAnswer(currentQuestion.id, value)}
        />
      )}
      <footer className="flex justify-between gap-3">
        <Button variant="secondary" onClick={store.prevQuestion} disabled={currentQuestionIndexInSubtest === 0}>
          Previous
        </Button>
        {currentQuestionIndexInSubtest >= currentSubtestQuestions.length - 1 ? (
          test && currentSubtest && test.subTests.findIndex((st) => st.id === currentSubtest.id) < test.subTests.length - 1 ? (
            <Button onClick={goToNextSubtest} className="bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]">
              Lanjut ke Sub-Tes Berikutnya
            </Button>
          ) : (
            <Button onClick={submit} className="bg-[var(--success)] text-white hover:bg-[var(--success-dark)]">
              Submit Ujian
            </Button>
          )
        ) : (
          <Button onClick={store.nextQuestion}>Next</Button>
        )}
      </footer>
    </main>
    </>
  );
}

export default function TakePage() {
  return (
    <Suspense fallback={<main className="container-page py-10 text-sm text-slate-600">Loading assessment...</main>}>
      <TakePageContent />
    </Suspense>
  );
}
