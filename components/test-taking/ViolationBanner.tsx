"use client";

import { useState } from "react";

export function ViolationBanner({ count }: { count: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (count === 0 || dismissed) {
    return null;
  }
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-center justify-between gap-3">
        <span>{count} proctoring event{count === 1 ? "" : "s"} recorded.</span>
        <button type="button" onClick={() => setDismissed(true)} className="font-medium">
          Dismiss
        </button>
      </div>
    </div>
  );
}
