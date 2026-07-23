import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "border-transparent bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-white shadow-[0_14px_24px_rgba(37,99,235,0.24)]",
        variant === "secondary" && "border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] text-[var(--foreground)]",
        variant === "ghost" && "border-transparent bg-transparent text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--surface-soft)_88%,transparent)] hover:text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}
