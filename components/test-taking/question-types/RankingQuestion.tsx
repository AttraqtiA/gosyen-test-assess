"use client";

import { mcqOptionSchema } from "@/lib/validation";

type Props = {
  options: unknown;
  value: string;
  onChange: (value: string) => void;
};

export function RankingQuestion({ options, value, onChange }: Props) {
  const parsed = mcqOptionSchema.array().safeParse(options);
  const current = value ? value.split(",") : parsed.success ? parsed.data.map((item) => item.id) : [];
  const labels = parsed.success ? new Map(parsed.data.map((item) => [item.id, item.label])) : new Map<string, string>();

  function move(id: string, direction: -1 | 1) {
    const index = current.indexOf(id);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) {
      return;
    }
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next.join(","));
  }

  return (
    <ol className="grid gap-2">
      {current.map((id, index) => (
        <li key={id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm">
          <span>
            {index + 1}. {labels.get(id) ?? id}
          </span>
          <span className="flex gap-2">
            <button type="button" className="text-slate-600" onClick={() => move(id, -1)}>
              Up
            </button>
            <button type="button" className="text-slate-600" onClick={() => move(id, 1)}>
              Down
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
