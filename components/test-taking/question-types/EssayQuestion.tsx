"use client";

import { Textarea } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function EssayQuestion({ value, onChange }: Props) {
  return (
    <div className="grid gap-2">
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="text-xs text-[var(--muted)]">{value.length} characters</span>
    </div>
  );
}
