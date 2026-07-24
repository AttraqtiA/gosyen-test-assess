import Link from "next/link";
import { ArrowRight, ClipboardCheck, ShieldCheck, Sparkles, BookOpen } from "lucide-react";

export default function CandidateLandingPage() {
  return (
    <main className="container-page min-h-[80vh] flex flex-col justify-center py-12 md:py-24">
      <div className="grid gap-12 lg:grid-cols-2 items-center">
        {/* Left Side: Hero Text */}
        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-semibold self-start">
            <Sparkles size={16} className="text-[var(--primary)]" />
            Platform Asesmen Universal
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-[var(--foreground)] font-display">
            Ukur Kompetensi dengan <span className="bg-gradient-to-r from-[var(--primary)] to-blue-500 bg-clip-text text-transparent">Presisi Tinggi</span>.
          </h1>
          
          <p className="text-lg text-[var(--muted)] leading-relaxed max-w-xl">
            Gosyen Assess menyediakan evaluasi komprehensif mulai dari tes psikologi (kepribadian), intelegensi (IQ/Logika), studi kasus, hingga review bertenaga AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link 
              href="/take" 
              className="inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-[var(--primary)]/20 active:scale-98"
            >
              Mulai Ujian
              <ArrowRight size={20} />
            </Link>
            <a 
              href="#features" 
              className="inline-flex items-center justify-center gap-2 border border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--border)] text-[var(--foreground)] font-semibold text-lg px-8 py-4 rounded-xl transition-all"
            >
              Pelajari Selengkapnya
            </a>
          </div>
        </div>

        {/* Right Side: Visual Card / Grid */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-blue-600 opacity-20 blur-xl"></div>
          <div className="relative panel p-8 border border-[var(--border)] bg-[var(--surface)] rounded-2xl grid gap-6 shadow-xl">
            <div className="flex items-center gap-4 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-soft)]/50">
              <div className="p-3 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)]">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)]">Multi-Kategori Ujian</h3>
                <p className="text-sm text-[var(--muted)]">Mendukung tes psikotes, kognitif, dan essay kustom.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-soft)]/50">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)]">Proktor & Keamanan Ketat</h3>
                <p className="text-sm text-[var(--muted)]">Sanksi freeze otomatis saat mendeteksi kecurangan pindah tab.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-soft)]/50">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)]">Simpan Otomatis (Autosave)</h3>
                <p className="text-sm text-[var(--muted)]">Progres jawaban disimpan otomatis di setiap detik pengerjaan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Anchor Section */}
      <section id="features" className="mt-24 pt-12 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center text-[var(--foreground)] mb-12">Fitur Unggulan Platform</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="p-6 border border-[var(--border)] bg-[var(--surface-soft)]/50 rounded-xl">
            <h4 className="font-bold text-lg mb-2">Evaluasi AI</h4>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Koreksi otomatis soal essay menggunakan integrasi AI Claude dari Anthropic.</p>
          </div>
          <div className="p-6 border border-[var(--border)] bg-[var(--surface-soft)]/50 rounded-xl">
            <h4 className="font-bold text-lg mb-2">Scoring Fleksibel</h4>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Rumus kalkulasi skor kustom dan pemetaan profil kandidat yang otomatis.</p>
          </div>
          <div className="p-6 border border-[var(--border)] bg-[var(--surface-soft)]/50 rounded-xl">
            <h4 className="font-bold text-lg mb-2">Multi-Tenant (Perusahaan)</h4>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Kelola batasan sesi, ujian, dan kandidat terpisah untuk setiap organisasi.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
