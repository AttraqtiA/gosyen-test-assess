"use client";

import { scaleOptionsSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";

type Props = {
  options: unknown;
  value: string;
  onChange: (value: string) => void;
};

export function ScaleQuestion({ options, value, onChange }: Props) {
  const parsed = scaleOptionsSchema.safeParse(options);
  if (!parsed.success) {
    return null;
  }
  const values = Array.from({ length: parsed.data.max - parsed.data.min + 1 }, (_, index) => parsed.data.min + index);
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{parsed.data.minLabel}</span>
        <span>{parsed.data.maxLabel}</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {values.map((item) => (
          <Button key={item} type="button" variant={value === String(item) ? "primary" : "secondary"} onClick={() => onChange(String(item))}>
            {item}
          </Button>
        ))}
      </div>
    </div>
  );
}
