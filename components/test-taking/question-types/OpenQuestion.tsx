"use client";

import { Textarea } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function OpenQuestion({ value, onChange }: Props) {
  return <Textarea value={value} onChange={(event) => onChange(event.target.value)} />;
}
