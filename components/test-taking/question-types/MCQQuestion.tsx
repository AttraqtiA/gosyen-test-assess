"use client";

import { mcqOptionSchema } from "@/lib/validation";

type Props = {
  questionId: string;
  options: unknown;
  value: string;
  onChange: (value: string) => void;
};

export function MCQQuestion({ questionId, options, value, onChange }: Props) {
  const parsed = mcqOptionSchema.array().safeParse(options);
  const items = parsed.success ? parsed.data : [];
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <input type="radio" name={questionId} checked={value === item.id} onChange={() => onChange(item.id)} />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}
