"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SubtestOption = {
  id: string;
  title: string;
};

export function SessionCreator({ testId, subTests }: { testId: string; subTests: SubtestOption[] }) {
  const [label, setLabel] = useState("");
  const [enabledSubtestIds, setEnabledSubtestIds] = useState(subTests.map((subTest) => subTest.id));
  const [message, setMessage] = useState<string | null>(null);

  async function createSession() {
    const response = await fetch(`/api/tests/${testId}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, enabledSubtestIds }),
    });
    const data = (await response.json()) as { code?: string; error?: string };
    setMessage(response.ok ? `Created session ${data.code}` : data.error ?? "Could not create session.");
  }

  function toggle(id: string) {
    setEnabledSubtestIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <section className="panel grid gap-5 p-5">
      <div>
        <p className="eyebrow">Generate candidate code</p>
        <h2 className="mt-2 text-2xl font-semibold">Create session</h2>
      </div>
      <Input placeholder="Internal label" value={label} onChange={(event) => setLabel(event.target.value)} />
      <div className="grid gap-3">
        {subTests.map((subTest) => (
          <label key={subTest.id} className="surface-block flex items-center gap-3 p-3 text-sm">
            <input type="checkbox" checked={enabledSubtestIds.includes(subTest.id)} onChange={() => toggle(subTest.id)} />
            {subTest.title}
          </label>
        ))}
      </div>
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
      <Button type="button" onClick={createSession}>
        <Plus size={16} />
        Generate session code
      </Button>
    </section>
  );
}
