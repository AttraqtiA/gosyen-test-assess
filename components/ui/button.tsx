import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "border-blue-700 bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" && "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}
