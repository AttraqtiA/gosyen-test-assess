"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField({ name = "password" }: { name?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className="input-shell pr-12"
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-[var(--muted)]"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
