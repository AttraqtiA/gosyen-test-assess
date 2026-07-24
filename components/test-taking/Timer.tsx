"use client";

import { useEffect, useState } from "react";

export function Timer({ seconds, onExpire }: { seconds: number | null; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining === null) {
      return;
    }
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const id = window.setTimeout(() => setRemaining((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [onExpire, remaining]);

  if (remaining === null) {
    return <span className="text-sm text-[var(--muted)]">Tidak ada batasan waktu</span>;
  }
  const minutes = Math.floor(remaining / 60);
  const secs = String(remaining % 60).padStart(2, "0");
  return <span className="font-mono text-sm font-semibold">{minutes}:{secs}</span>;
}
