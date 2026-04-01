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
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: isDisabled ? "#e5e7eb" : "#3B82F6",
          color: isDisabled ? "#9ca3af" : "#ffffff",
          border: "none",
          borderRadius: 8,
          padding: "8px 20px",
          fontSize: 14,
          fontWeight: 600,
          cursor: isDisabled ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {isExporting ? "导出中..." : "⬇ 导出 PPTX"}
      </button>
      {error && (
        <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>
      )}
    </div>
  );
}
