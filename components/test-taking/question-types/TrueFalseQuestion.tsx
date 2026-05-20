"use client";

import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function TrueFalseQuestion({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button type="button" variant={value === "true" ? "primary" : "secondary"} onClick={() => onChange("true")}>
        True
      </Button>
      <Button type="button" variant={value === "false" ? "primary" : "secondary"} onClick={() => onChange("false")}>
        False
      </Button>
    </div>
  );
}
