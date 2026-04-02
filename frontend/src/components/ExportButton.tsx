import { useState } from "react";
import type { Presentation } from "../types/schema";
import { downloadPPTX } from "../services/pptxExport";

interface Props {
  presentation: Presentation;
  disabled?: boolean;
}

export function ExportButton({ presentation, disabled }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string>("");

  const handleExport = async () => {
    if (isExporting || presentation.slides.length === 0) return;
    setIsExporting(true);
    setError("");
    try {
      await downloadPPTX(presentation, "presentation.pptx");
    } catch (e) {
      setError((e as Error).message || "导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = disabled || isExporting || presentation.slides.length === 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={handleExport}
        disabled={isDisabled}
        className="btn btn-primary"
        style={{ padding: "7px 18px", fontSize: 13 }}
      >
        {isExporting
          ? <><span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>↻</span> 导出中…</>
          : "↓ 导出 PPTX"}
      </button>
      {error && (
        <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 500 }}>{error}</span>
      )}
    </div>
  );
}
