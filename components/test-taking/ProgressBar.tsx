"use client";

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-xs text-slate-600">
        <span>
          Question {current} of {total}
        </span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-blue-600" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
