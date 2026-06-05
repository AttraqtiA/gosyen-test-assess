"use client";

import { LoaderCircle, PauseCircle, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function TestStatusToggle({ testId, isActive }: { testId: string; isActive: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateStatus(nextValue: boolean) {
    setMessage(null);
    const response = await fetch(`/api/tests/${testId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: nextValue }),
    });
    const data = (await response.json()) as { isActive?: boolean; error?: string };

    if (!response.ok || typeof data.isActive !== "boolean") {
      setMessage(data.error ?? "Could not update test status.");
      return;
    }

    setActive(data.isActive);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => updateStatus(!active)}
        disabled={isPending}
        className={active ? "button-secondary" : "button-primary"}
      >
        {isPending ? <LoaderCircle size={16} className="animate-spin" /> : active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
        {active ? "Set passive" : "Activate test"}
      </button>
      {message && <p className="text-sm text-[var(--danger)]">{message}</p>}
    </div>
  );
}
