"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props =
  | { kind: "attempt"; attemptId: string; testId?: never }
  | { kind: "batch"; testId: string; attemptId?: never };

export function ExportButton(props: Props) {
  const [loading, setLoading] = useState(false);

  async function runExport() {
    setLoading(true);
    const response =
      props.kind === "attempt"
        ? await fetch(`/api/attempts/${props.attemptId}/export`)
        : await fetch("/api/export/batch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ testId: props.testId }),
          });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = props.kind === "attempt" ? `attempt-${props.attemptId}.xlsx` : `batch-${props.testId}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <Button type="button" onClick={runExport} disabled={loading}>
      <Download size={16} />
      {loading ? "Exporting..." : props.kind === "attempt" ? "Export this attempt" : "Export all results"}
    </Button>
  );
}
