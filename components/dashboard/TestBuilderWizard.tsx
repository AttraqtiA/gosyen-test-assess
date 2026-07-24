"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronRight, Save, LayoutGrid, HelpCircle, Check, Settings2, Upload } from "lucide-react";

const steps = ["Test Info", "Structure (SubTests)", "Questions", "Scoring Config", "Review & Save"];

type Option = { id: string; label: string };

type Question = {
  id?: string;
  body: string;
  type: "MCQ" | "ESSAY" | "SCALE" | "RANKING" | "TRUE_FALSE" | "OPEN";
  order: number;
  options: any; // MCQ options, scale config, etc.
  correctAnswer: string | null;
  weight: number;
  dimension: string | null;
  scoringHint: string | null;
};

type SubTest = {
  id?: string;
  title: string;
  description: string | null;
  order: number;
  timeLimitSecs: number | null;
  isEnabled: boolean;
  scoringConfig: any;
  questions: Question[];
};

export function TestBuilderWizard() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.id as string;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test configuration state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"PERSONALITY" | "IQ_LOGIC" | "INTERVIEW" | "KAHOOT" | "COMPOSITE" | "CUSTOM">("COMPOSITE");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResultsToCandidate, setShowResultsToCandidate] = useState(false);
  const [passingThreshold, setPassingThreshold] = useState<number | null>(null);
  const [compositeFormula, setCompositeFormula] = useState("");
  const [freezeOnTabSwitch, setFreezeOnTabSwitch] = useState(false);
  const [freezeDurationSecs, setFreezeDurationSecs] = useState<number | null>(10);
  const [subTests, setSubTests] = useState<SubTest[]>([]);

  // Editor states
  const [activeSubTestIndex, setActiveSubTestIndex] = useState(0);

  // Fetch test configuration if editing
  useEffect(() => {
    if (!testId) return;

    async function loadTest() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tests/${testId}`);
        if (!response.ok) {
          throw new Error("Failed to load test details.");
        }
        const data = await response.json();
        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setCategory(data.category ?? "COMPOSITE");
        setTimeLimitMinutes(data.timeLimitMinutes);
        setIsActive(data.isActive ?? true);
        setShuffleQuestions(data.shuffleQuestions ?? false);
        setShowResultsToCandidate(data.showResultsToCandidate ?? false);
        setPassingThreshold(data.passingThreshold);
        setCompositeFormula(data.scoringConfig?.compositeFormula ?? "");
        setFreezeOnTabSwitch(data.scoringConfig?.proctoringConfig?.freezeOnTabSwitch ?? false);
        setFreezeDurationSecs(data.scoringConfig?.proctoringConfig?.freezeDurationSecs ?? 10);
        
        // Map subtests and sanitize questions
        const mappedSubTests = (data.subTests ?? []).map((sub: any) => ({
          id: sub.id,
          title: sub.title ?? "",
          description: sub.description ?? "",
          order: sub.order ?? 1,
          timeLimitSecs: sub.timeLimitSecs,
          isEnabled: sub.isEnabled ?? true,
          scoringConfig: sub.scoringConfig ?? {},
          questions: (sub.questions ?? []).map((q: any) => ({
            id: q.id,
            body: q.body ?? "",
            type: q.type ?? "MCQ",
            order: q.order ?? 1,
            options: q.options ?? null,
            correctAnswer: q.correctAnswer ?? "",
            weight: q.weight ?? 1.0,
            dimension: q.dimension ?? "",
            scoringHint: q.scoringHint ?? "",
          })),
        }));
        setSubTests(mappedSubTests);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    void loadTest();
  }, [testId]);

  // Save changes
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        description,
        category,
        timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        isActive,
        shuffleQuestions,
        showResultsToCandidate,
        passingThreshold: passingThreshold ? Number(passingThreshold) : null,
        scoringConfig: {
          compositeFormula: compositeFormula || undefined,
          proctoringConfig: freezeOnTabSwitch ? { freezeOnTabSwitch, freezeDurationSecs: freezeDurationSecs ? Number(freezeDurationSecs) : 10 } : undefined,
        },
        subTests: subTests.map((sub, idx) => ({
          id: sub.id,
          title: sub.title,
          description: sub.description,
          order: idx + 1,
          timeLimitSecs: sub.timeLimitSecs ? Number(sub.timeLimitSecs) : null,
          isEnabled: sub.isEnabled,
          scoringConfig: sub.scoringConfig,
          questions: sub.questions.map((q, qIdx) => ({
            id: q.id,
            body: q.body,
            type: q.type,
            order: qIdx + 1,
            options: q.options,
            correctAnswer: q.correctAnswer || null,
            weight: Number(q.weight),
            dimension: q.dimension || null,
            scoringHint: q.scoringHint || null,
          })),
        })),
      };

      const response = await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error ?? "Failed to save the test configuration.");
      }

      router.push("/dashboard/tests");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Helper actions for SubTests
  function addSubTest() {
    const newSub: SubTest = {
      title: `SubTest Baru ${subTests.length + 1}`,
      description: "",
      order: subTests.length + 1,
      timeLimitSecs: null,
      isEnabled: true,
      scoringConfig: { strategy: "correct_count" },
      questions: [],
    };
    setSubTests([...subTests, newSub]);
    setActiveSubTestIndex(subTests.length);
  }

  function removeSubTest(index: number) {
    const updated = subTests.filter((_, idx) => idx !== index);
    setSubTests(updated);
    setActiveSubTestIndex(Math.max(0, index - 1));
  }

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  async function handleSubTestFileUpload(idx: number, file: File) {
    setUploadingIdx(idx);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      const isImg = data.type.startsWith("image/");
      const insertText = isImg
        ? `<img src="${data.url}" style="max-width:100%; height:auto; margin:10px 0; border-radius:8px;" alt="${data.name}" />`
        : `<a href="${data.url}" target="_blank" class="text-blue-600 underline hover:text-blue-800">Unduh File (${data.name})</a>`;
      
      const updated = [...subTests];
      const prevDesc = updated[idx]!.description || "";
      updated[idx]!.description = prevDesc + (prevDesc ? "\n" : "") + insertText;
      setSubTests(updated);
    } catch (err: any) {
      alert("Gagal mengunggah file: " + err.message);
    } finally {
      setUploadingIdx(null);
    }
  }

  const [uploadingQIdx, setUploadingQIdx] = useState<number | null>(null);

  async function handleQuestionFileUpload(idx: number, file: File) {
    setUploadingQIdx(idx);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      const isImg = data.type.startsWith("image/");
      const insertText = isImg
        ? `<img src="${data.url}" style="max-width:100%; height:auto; margin:10px 0; border-radius:8px;" alt="${data.name}" />`
        : `<a href="${data.url}" target="_blank" class="text-blue-600 underline hover:text-blue-800">Unduh File (${data.name})</a>`;
      
      const activeSub = subTests[activeSubTestIndex]!;
      const updatedQuestions = [...activeSub.questions];
      const prevBody = updatedQuestions[idx]!.body || "";
      
      updateQuestion(idx, "body", prevBody + (prevBody ? "\n" : "") + insertText);
    } catch (err: any) {
      alert("Gagal mengunggah file: " + err.message);
    } finally {
      setUploadingQIdx(null);
    }
  }

  const [uploadingOptQIdx, setUploadingOptQIdx] = useState<number | null>(null);
  const [uploadingOptIdx, setUploadingOptIdx] = useState<number | null>(null);

  async function handleOptionFileUpload(qIdx: number, oIdx: number, file: File) {
    setUploadingOptQIdx(qIdx);
    setUploadingOptIdx(oIdx);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      const isImg = data.type.startsWith("image/");
      const insertText = isImg
        ? `<img src="${data.url}" style="max-width:100%; height:auto; margin:5px 0; border-radius:4px;" alt="${data.name}" />`
        : `<a href="${data.url}" target="_blank" class="text-blue-600 underline hover:text-blue-800 font-normal">File: ${data.name}</a>`;
      
      const activeSub = subTests[activeSubTestIndex]!;
      const q = activeSub.questions[qIdx]!;
      const updatedOpts = [...q.options];
      const prevLabel = updatedOpts[oIdx]!.label || "";
      
      updatedOpts[oIdx]!.label = prevLabel + (prevLabel ? " " : "") + insertText;
      updateQuestion(qIdx, "options", updatedOpts);
    } catch (err: any) {
      alert("Gagal mengunggah file: " + err.message);
    } finally {
      setUploadingOptQIdx(null);
      setUploadingOptIdx(null);
    }
  }

  // Reorder subtest
  function moveSubTest(index: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= subTests.length) return;
    const updated = [...subTests];
    const temp = updated[index]!;
    updated[index] = updated[targetIdx]!;
    updated[targetIdx] = temp;
    setSubTests(updated);
  }

  // Helper actions for Questions under Active SubTest
  function addQuestionToActiveSub() {
    if (subTests.length === 0) return;
    const activeSub = subTests[activeSubTestIndex]!;
    const newQ: Question = {
      body: "Pertanyaan Baru",
      type: "MCQ",
      order: activeSub.questions.length + 1,
      options: [
        { id: "A", label: "Pilihan A" },
        { id: "B", label: "Pilihan B" },
      ],
      correctAnswer: "A",
      weight: 1.0,
      dimension: "",
      scoringHint: "",
    };

    const updatedSubtests = [...subTests];
    updatedSubtests[activeSubTestIndex] = {
      ...activeSub,
      questions: [...activeSub.questions, newQ],
    };
    setSubTests(updatedSubtests);
  }

  function updateQuestion(qIndex: number, field: keyof Question, value: any) {
    const activeSub = subTests[activeSubTestIndex]!;
    const updatedQuestions = [...activeSub.questions];
    
    // Auto populate option structure if type changes
    if (field === "type") {
      let options = null;
      let correctAnswer = "";
      if (value === "MCQ") {
        options = [{ id: "A", label: "Pilihan A" }, { id: "B", label: "Pilihan B" }];
        correctAnswer = "A";
      } else if (value === "SCALE") {
        options = { min: 1, max: 5, minLabel: "Sangat Tidak Setuju", maxLabel: "Sangat Setuju" };
      } else if (value === "TRUE_FALSE") {
        correctAnswer = "TRUE";
      }
      updatedQuestions[qIndex] = {
        ...updatedQuestions[qIndex]!,
        type: value,
        options,
        correctAnswer,
      };
    } else {
      updatedQuestions[qIndex] = {
        ...updatedQuestions[qIndex]!,
        [field]: value,
      };
    }

    const updatedSubtests = [...subTests];
    updatedSubtests[activeSubTestIndex] = {
      ...activeSub,
      questions: updatedQuestions,
    };
    setSubTests(updatedSubtests);
  }

  function removeQuestionFromActiveSub(qIndex: number) {
    const activeSub = subTests[activeSubTestIndex]!;
    const updatedQuestions = activeSub.questions.filter((_, idx) => idx !== qIndex);
    
    const updatedSubtests = [...subTests];
    updatedSubtests[activeSubTestIndex] = {
      ...activeSub,
      questions: updatedQuestions,
    };
    setSubTests(updatedSubtests);
  }

  if (loading) {
    return <main className="container-page py-20 text-center text-[var(--muted)]">Loading test structure...</main>;
  }

  return (
    <main className="container-page grid gap-5 py-8 lg:grid-cols-[280px_1fr]">
      {/* Wizard Sidebar */}
      <aside className="panel h-fit p-4 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-[var(--foreground)]">Edit Assessment</h2>
          <p className="text-xs text-[var(--muted)] mt-1">{title || "Untitled Test"}</p>
        </div>
        <nav className="grid gap-1 text-sm">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setStep(index)}
              className={`rounded-md px-3 py-2 text-left transition-colors flex items-center justify-between ${
                index === step
                  ? "bg-[var(--surface-soft)] font-medium text-[var(--foreground)] border-l-4 border-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              <span>{index + 1}. {item}</span>
              {index < step && <Check size={14} className="text-[var(--success)]" />}
            </button>
          ))}
        </nav>
        {testId && (
          <div className="border-t border-[var(--border)] pt-3">
            <Button
              className="w-full flex items-center justify-center gap-2"
              variant="secondary"
              disabled={saving}
              onClick={handleSave}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Test"}
            </Button>
          </div>
        )}
      </aside>

      {/* Editor Content Area */}
      <section className="panel grid gap-5 p-6 shadow-sm border border-[var(--border)] rounded-lg">
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{steps[step]}</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-soft)] text-[var(--foreground)]">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-[var(--danger)]/15 text-[var(--danger)] rounded-md text-sm border border-[var(--danger)]/30">
            {error}
          </div>
        )}

        {/* STEP 1: TEST METADATA */}
        {step === 0 && (
          <div className="grid gap-4 max-w-2xl">
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-[var(--foreground)]">Judul Ujian</label>
              <Input
                placeholder="Contoh: IST & Studi Kasus"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-[var(--foreground)]">Deskripsi Ujian</label>
              <Textarea
                placeholder="Jelaskan instruksi ujian secara garis besar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold text-[var(--foreground)]">Kategori Tes</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="select-shell h-10 text-sm"
                >
                  <option value="COMPOSITE">COMPOSITE (IST / Multi-SubTest)</option>
                  <option value="INTERVIEW">INTERVIEW (Essay Only)</option>
                  <option value="PERSONALITY">PERSONALITY</option>
                  <option value="IQ_LOGIC">IQ & LOGIC</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold text-[var(--foreground)]">Batas Waktu Global (Menit)</label>
                <Input
                  type="number"
                  placeholder="Kosongkan jika menggunakan batas waktu per sub-tes"
                  value={timeLimitMinutes ?? ""}
                  onChange={(e) => setTimeLimitMinutes(e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Ujian Aktif (Kandidat dapat memulai pengerjaan jika memiliki kode)
              </label>
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Acak Urutan Soal saat Ujian dimulai
              </label>
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={showResultsToCandidate}
                  onChange={(e) => setShowResultsToCandidate(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Tampilkan hasil nilai/profile ke kandidat setelah submit
              </label>
              <div className="border-t border-[var(--border)] pt-4 mt-2 flex flex-col gap-3">
                <label className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={freezeOnTabSwitch}
                    onChange={(e) => setFreezeOnTabSwitch(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] text-[var(--danger)] focus:ring-[var(--danger)]"
                  />
                  Terapkan Freeze (layar membeku) saat kandidat pindah tab
                </label>
                {freezeOnTabSwitch && (
                  <div className="grid gap-1.5 ml-7 w-48">
                    <label className="text-xs font-semibold text-[var(--muted)]">Durasi Freeze (detik)</label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={freezeDurationSecs ?? ""}
                      onChange={(e) => setFreezeDurationSecs(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: STRUCTURE (SUBTESTS) */}
        {step === 1 && (
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[var(--muted)]">Daftar bagian/sub-tes di dalam ujian ini. Urutan akan menentukan alur pengerjaan.</p>
              <Button type="button" onClick={addSubTest} className="flex items-center gap-1.5">
                <Plus size={16} /> Add SubTest
              </Button>
            </div>

            <div className="grid gap-3">
              {subTests.map((sub, idx) => (
                <article key={idx} className="p-4 border border-[var(--border)] rounded-md bg-[var(--surface-soft)] flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--foreground)]">#{idx + 1}</span>
                      <Input
                        className="font-semibold h-8 w-64"
                        value={sub.title}
                        onChange={(e) => {
                          const updated = [...subTests];
                          updated[idx]!.title = e.target.value;
                          setSubTests(updated);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => moveSubTest(idx, "up")} disabled={idx === 0}>
                        <ArrowUp size={16} />
                      </Button>
                      <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => moveSubTest(idx, "down")} disabled={idx === subTests.length - 1}>
                        <ArrowDown size={16} />
                      </Button>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--danger)] hover:bg-[var(--danger)]/10" onClick={() => removeSubTest(idx)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_200px] gap-4">
                    <div className="flex flex-col gap-2">
                      <Textarea
                        placeholder="Petunjuk, contoh pengerjaan, atau deskripsi sub-tes (dapat menggunakan HTML)..."
                        value={sub.description ?? ""}
                        onChange={(e) => {
                          const updated = [...subTests];
                          updated[idx]!.description = e.target.value;
                          setSubTests(updated);
                        }}
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-[var(--surface-soft)] hover:bg-[var(--border)] border border-[var(--border)] rounded text-[var(--foreground)] transition-colors">
                          <Upload size={12} />
                          {uploadingIdx === idx ? "Uploading..." : "Unggah Gambar / File"}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                void handleSubTestFileUpload(idx, file);
                              }
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-[var(--muted)]">Format: JPG, PNG, PDF, dll. (Otomatis disisipkan ke teks)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Waktu (detik)"
                        value={sub.timeLimitSecs ?? ""}
                        onChange={(e) => {
                          const updated = [...subTests];
                          updated[idx]!.timeLimitSecs = e.target.value ? Number(e.target.value) : null;
                          setSubTests(updated);
                        }}
                        className="text-right"
                      />
                      <span className="text-xs text-[var(--muted)]">detik</span>
                    </div>
                  </div>
                </article>
              ))}
              {subTests.length === 0 && (
                <div className="p-10 border border-dashed border-[var(--border)] rounded-md text-center text-[var(--muted)] text-sm">
                  Belum ada bagian sub-tes. Klik "Add SubTest" untuk membuat.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: QUESTIONS */}
        {step === 2 && (
          <div className="grid gap-5">
            {subTests.length === 0 ? (
              <div className="p-10 text-center text-[var(--muted)] text-sm border border-[var(--border)] rounded-md">
                Harap buat SubTest terlebih dahulu di bagian Structure.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Pilih SubTest:</span>
                    <select
                      value={activeSubTestIndex}
                      onChange={(e) => setActiveSubTestIndex(Number(e.target.value))}
                      className="select-shell h-9 text-sm w-72"
                    >
                      {subTests.map((sub, idx) => (
                        <option key={idx} value={idx}>
                          #{idx + 1} - {sub.title} ({sub.questions.length} Soal)
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" onClick={addQuestionToActiveSub} className="flex items-center gap-1.5">
                    <Plus size={16} /> Tambah Soal
                  </Button>
                </div>

                <div className="grid gap-4">
                  {subTests[activeSubTestIndex]?.questions.map((q, idx) => (
                    <article key={idx} className="p-4 border border-[var(--border)] rounded-md bg-[var(--surface-soft)] flex flex-col gap-3 shadow-xs">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-[var(--muted)] block mb-1">SOAL #{idx + 1}</span>
                          <div className="flex flex-col gap-2">
                            <Textarea
                              placeholder="Tuliskan pertanyaan disini..."
                              value={q.body}
                              onChange={(e) => updateQuestion(idx, "body", e.target.value)}
                              rows={3}
                            />
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-[var(--surface-soft)] hover:bg-[var(--border)] border border-[var(--border)] rounded text-[var(--foreground)] transition-colors">
                                <Upload size={12} />
                                {uploadingQIdx === idx ? "Uploading..." : "Unggah Gambar / File"}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      void handleQuestionFileUpload(idx, file);
                                    }
                                  }}
                                />
                              </label>
                              <span className="text-[10px] text-[var(--muted)]">Format: JPG, PNG, PDF, dll. (Otomatis disisipkan ke soal)</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-48">
                          <label className="text-xs font-semibold text-[var(--muted)]">Tipe Soal</label>
                          <select
                            value={q.type}
                            onChange={(e) => updateQuestion(idx, "type", e.target.value)}
                            className="select-shell h-8 text-xs"
                          >
                            <option value="MCQ">Pilihan Ganda (MCQ)</option>
                            <option value="ESSAY">Essay / Studi Kasus</option>
                            <option value="SCALE">Skala Likert (Scale)</option>
                            <option value="TRUE_FALSE">Benar / Salah</option>
                            <option value="OPEN">Jawaban Singkat</option>
                          </select>
                          <Button
                            variant="ghost"
                            className="text-[var(--danger)] hover:bg-[var(--danger)]/10 mt-1 h-8 justify-start gap-1.5 p-2 text-xs"
                            onClick={() => removeQuestionFromActiveSub(idx)}
                          >
                            <Trash2 size={14} /> Hapus Soal
                          </Button>
                        </div>
                      </div>

                      {/* Tipe MCQ: Pilihan Jawaban */}
                      {q.type === "MCQ" && (
                        <div className="pl-4 border-l-2 border-[var(--border)] grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)] block">Pilihan Jawaban (Opsi):</label>
                          {Array.isArray(q.options) &&
                            q.options.map((opt: Option, oIdx: number) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-[var(--foreground)]">{opt.id}</span>
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    value={opt.label}
                                    onChange={(e) => {
                                      const updatedOpts = [...q.options];
                                      updatedOpts[oIdx]!.label = e.target.value;
                                      updateQuestion(idx, "options", updatedOpts);
                                    }}
                                    className="h-8 text-xs flex-1"
                                  />
                                  <label className="cursor-pointer p-1.5 bg-[var(--surface-soft)] hover:bg-[var(--border)] border border-[var(--border)] rounded text-[var(--foreground)] transition-colors h-8 flex items-center justify-center" title="Unggah file untuk pilihan jawaban ini">
                                    <Upload size={12} />
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          void handleOptionFileUpload(idx, oIdx, file);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                                <input
                                  type="radio"
                                  name={`correct-radio-${idx}`}
                                  checked={q.correctAnswer === opt.id}
                                  onChange={() => updateQuestion(idx, "correctAnswer", opt.id)}
                                  className="h-4 w-4 border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <span className="text-[10px] text-[var(--muted)]">Kunci</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Tipe Essay/Open: Rubric/Scoring Hint */}
                      {(q.type === "ESSAY" || q.type === "OPEN") && (
                        <div className="grid gap-1">
                          <label className="text-xs font-semibold text-[var(--muted)]">Panduan Penilaian / Rubrik (Scoring Hint):</label>
                          <Input
                            placeholder="Contoh: Nilai 0-100 berdasarkan kesesuaian solusi..."
                            value={q.scoringHint ?? ""}
                            onChange={(e) => updateQuestion(idx, "scoringHint", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      {/* Tipe True/False */}
                      {q.type === "TRUE_FALSE" && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">Jawaban Benar:</label>
                          <select
                            value={q.correctAnswer ?? "TRUE"}
                            onChange={(e) => updateQuestion(idx, "correctAnswer", e.target.value)}
                            className="select-shell h-8 text-xs w-32"
                          >
                            <option value="TRUE">BENAR (TRUE)</option>
                            <option value="FALSE">SALAH (FALSE)</option>
                          </select>
                        </div>
                      )}

                      <div className="flex gap-4 border-t border-[var(--border)] pt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--muted)] font-medium">Bobot Soal:</span>
                          <Input
                            type="number"
                            value={q.weight}
                            onChange={(e) => updateQuestion(idx, "weight", e.target.value ? Number(e.target.value) : 1.0)}
                            className="h-6 w-16 text-center text-xs p-1"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--muted)] font-medium">Dimensi / Tag:</span>
                          <Input
                            placeholder="Contoh: SE1"
                            value={q.dimension ?? ""}
                            onChange={(e) => updateQuestion(idx, "dimension", e.target.value)}
                            className="h-6 w-24 text-xs p-1"
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                  {(!subTests[activeSubTestIndex]?.questions || subTests[activeSubTestIndex]?.questions.length === 0) && (
                    <div className="p-10 border border-dashed border-[var(--border)] rounded-md text-center text-[var(--muted)] text-sm">
                      Belum ada pertanyaan pada sub-tes ini. Klik "Tambah Soal" untuk membuat.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 4: SCORING CONFIG */}
        {step === 3 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-4">
              <h3 className="text-md font-semibold text-[var(--foreground)] flex items-center gap-1">
                <Settings2 size={16} /> Metode Scoring Per SubTest
              </h3>
              {subTests.map((sub, idx) => (
                <div key={idx} className="p-3 border border-[var(--border)] rounded-md bg-[var(--surface-soft)] flex flex-col gap-2">
                  <div className="font-semibold text-sm text-[var(--foreground)]">{sub.title}</div>
                  <div className="grid grid-cols-[150px_1fr] gap-2 items-center">
                    <label className="text-xs text-[var(--muted)] font-medium">Strategi Nilai:</label>
                    <select
                      value={sub.scoringConfig?.strategy ?? "correct_count"}
                      onChange={(e) => {
                        const updated = [...subTests];
                        updated[idx]!.scoringConfig = {
                          ...updated[idx]!.scoringConfig,
                          strategy: e.target.value,
                        };
                        setSubTests(updated);
                      }}
                      className="select-shell h-8 text-xs"
                    >
                      <option value="correct_count">Jumlah Benar (correct_count)</option>
                      <option value="weighted_sum">Total Bobot Nilai (weighted_sum)</option>
                      <option value="sum_by_dimension">Jumlah Berdasarkan Dimensi</option>
                      <option value="average_scale">Rata-rata Skala</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 h-fit p-4 border border-[var(--border)] rounded-md bg-[var(--surface-soft)]">
              <h3 className="text-md font-semibold text-[var(--foreground)] flex items-center gap-1">
                <LayoutGrid size={16} /> Rumus Nilai Gabungan (Composite)
              </h3>
              <p className="text-xs text-[var(--muted)]">Gunakan penjumlahan judul sub-tes sebagai variabel untuk menghitung total nilai gabungan.</p>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]">Formula Nilai Total</label>
                <Input
                  placeholder="Contoh: SE1 + SE2 + SE3 + SE5 + SE6"
                  value={compositeFormula}
                  onChange={(e) => setCompositeFormula(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & SAVE */}
        {step === 4 && (
          <div className="grid gap-5">
            <div className="p-4 bg-[var(--surface-soft)] border border-[var(--border)] rounded-md">
              <h3 className="font-bold text-[var(--foreground)] text-lg mb-2">Rangkuman Konfigurasi Ujian</h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-[var(--muted)]">
                <div><span className="font-medium text-[var(--foreground)]">Nama Ujian:</span> {title || "-"}</div>
                <div><span className="font-medium text-[var(--foreground)]">Kategori:</span> {category}</div>
                <div><span className="font-medium text-[var(--foreground)]">Total SubTest:</span> {subTests.length}</div>
                <div><span className="font-medium text-[var(--foreground)]">Batas Waktu:</span> {timeLimitMinutes ? `${timeLimitMinutes} menit` : "Ditentukan per sub-tes"}</div>
                <div><span className="font-medium text-[var(--foreground)]">Acak Soal:</span> {shuffleQuestions ? "Ya" : "Tidak"}</div>
                <div><span className="font-medium text-[var(--foreground)]">Rumus Gabungan:</span> <code className="bg-[var(--surface-soft)] border border-[var(--border)] px-1 rounded font-mono">{compositeFormula || "-"}</code></div>
              </div>
            </div>

            <div className="grid gap-3">
              <h4 className="font-semibold text-[var(--foreground)]">Struktur SubTest & Jumlah Soal:</h4>
              {subTests.map((sub, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 border-b border-[var(--border)] text-sm">
                  <div>
                    <span className="font-semibold text-[var(--foreground)]">#{idx + 1} - {sub.title}</span>
                    <span className="text-xs text-[var(--muted)] block">{sub.description || "Tidak ada deskripsi"}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-[var(--muted)]">
                    <span>{sub.questions.length} Soal</span>
                    <span>{sub.timeLimitSecs ? `${sub.timeLimitSecs} detik` : "Tanpa waktu"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border)] pt-4 flex justify-end">
              <Button
                type="button"
                className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"
                disabled={saving || !title}
                onClick={handleSave}
              >
                <Save size={18} />
                {saving ? "Menyimpan Ujian..." : "Simpan Ujian (MySQL)"}
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between border-t border-[var(--border)] pt-4 mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            disabled={step === steps.length - 1}
            onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
          >
            Next
          </Button>
        </div>
      </section>
    </main>
  );
}
