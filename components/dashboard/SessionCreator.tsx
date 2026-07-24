"use client";

import { useState } from "react";
import { Plus, Copy, Check, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SubtestOption = {
  id: string;
  title: string;
};

type Session = {
  id: string;
  code: string;
  label: string | null;
  useCount: number;
  maxUses: number | null;
  enabledSubtestIds: string[];
  createdAt: string | Date;
};

export function SessionCreator({ 
  testId, 
  subTests,
  initialSessions = [],
  appUrl
}: { 
  testId: string; 
  subTests: SubtestOption[];
  initialSessions?: Session[];
  appUrl: string;
}) {
  const [label, setLabel] = useState("");
  const [enabledSubtestIds, setEnabledSubtestIds] = useState(subTests.map((subTest) => subTest.id));
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // History states
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [showHistory, setShowHistory] = useState(false);

  async function createSession() {
    setError(null);
    setCreatedCode(null);
    const response = await fetch(`/api/tests/${testId}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, enabledSubtestIds }),
    });
    const data = (await response.json()) as Session & { error?: string };
    if (response.ok && data.code) {
      setCreatedCode(data.code);
      setLabel("");
      setSessions((prev) => [data, ...prev]);
    } else {
      setError(data.error ?? "Could not create session.");
    }
  }

  function toggle(id: string) {
    setEnabledSubtestIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  const candidateLink = createdCode ? `${appUrl}/take?code=${createdCode}` : "";

  function copyToClipboard(text: string, type: "code" | "link") {
    navigator.clipboard.writeText(text).catch(() => undefined);
    if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  return (
    <>
      <section className="panel grid gap-5 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="eyebrow">Generate candidate code</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">Create session</h2>
          </div>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setShowHistory(true)} 
            className="gap-2 text-xs h-9"
          >
            <History size={14} />
            Riwayat Sesi ({sessions.length})
          </Button>
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-semibold text-[var(--foreground)]">Nama Sesi / Label Internal</label>
          <Input placeholder="Contoh: Batch 3 — Marketing" value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-semibold text-[var(--foreground)]">Pilih Sub-Tes yang Diaktifkan untuk Sesi Ini</label>
          <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
            {subTests.map((subTest) => (
              <label key={subTest.id} className="surface-block flex items-center gap-3 p-3 text-sm text-[var(--foreground)] cursor-pointer hover:bg-[var(--surface-soft)] transition-colors">
                <input 
                  type="checkbox" 
                  checked={enabledSubtestIds.includes(subTest.id)} 
                  onChange={() => toggle(subTest.id)} 
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                {subTest.title}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <Button type="button" onClick={createSession} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2">
          <Plus size={16} />
          Generate session code
        </Button>

        {createdCode && (
          <article className="p-5 border-2 border-dashed border-[var(--success)]/40 rounded-xl bg-[var(--success)]/5 grid gap-4 mt-2">
            <div>
              <span className="text-xs font-bold text-[var(--success)] uppercase tracking-wider block">BERHASIL DIBUAT</span>
              <h3 className="text-md font-semibold text-[var(--foreground)] mt-1">Gunakan detail berikut untuk mengundang kandidat:</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Box Kode Sesi */}
              <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] flex flex-col gap-1 items-center justify-center text-center relative group">
                <span className="text-xs text-[var(--muted)] font-medium">KODE SESI</span>
                <span className="font-mono text-3xl font-bold tracking-widest text-[var(--primary)]">{createdCode}</span>
                <button 
                  onClick={() => copyToClipboard(createdCode, "code")}
                  className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Box Link Kandidat */}
              <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] flex flex-col gap-1 items-center justify-center text-center relative group">
                <span className="text-xs text-[var(--muted)] font-medium">LINK UJIAN KANDIDAT</span>
                <span className="text-xs text-[var(--foreground)] font-mono truncate max-w-full px-2 mt-1">{candidateLink}</span>
                <button 
                  onClick={() => copyToClipboard(candidateLink, "link")}
                  className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  title="Copy link"
                >
                  {copiedLink ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </article>
        )}
      </section>

      {/* Modal Riwayat Sesi */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
            <header className="flex justify-between items-center p-5 border-b border-[var(--border)]">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Riwayat Kode Sesi</h3>
                <p className="text-xs text-[var(--muted)]">Daftar kode sesi yang telah dibuat sebelumnya</p>
              </div>
              <button 
                onClick={() => setShowHistory(false)} 
                className="p-1.5 rounded-md hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <X size={18} />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-5 grid gap-3">
              {sessions.map((session) => (
                <article key={session.id} className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] grid gap-2 relative">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xl font-bold text-[var(--foreground)]">{session.code}</div>
                      <p className="text-xs text-[var(--muted)] font-medium">{session.label ?? "Tanpa nama sesi"}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-[var(--border)] text-[var(--foreground)] font-medium">
                      {session.useCount}{session.maxUses ? ` / ${session.maxUses}` : ""} uses
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1 border-t border-[var(--border)]/50 pt-2">
                    <span className="font-mono text-[var(--muted)] truncate max-w-[280px]">
                      {appUrl}/take?code={session.code}
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${appUrl}/take?code=${session.code}`);
                        alert("Link berhasil disalin!");
                      }}
                      className="text-[var(--primary)] hover:underline font-semibold"
                    >
                      Salin Link
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--muted)]">
                    Subtest aktif: {subTests.filter((s) => (session.enabledSubtestIds ?? []).includes(s.id)).map((s) => s.title).join(", ") || "Tidak ada"}
                  </p>
                </article>
              ))}
              {sessions.length === 0 && (
                <div className="p-8 text-center text-sm text-[var(--muted)]">Belum ada kode sesi yang digenerate.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
