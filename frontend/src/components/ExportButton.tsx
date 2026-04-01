import { useState } from "react";
import type { Presentation } from "../types/schema";

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
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presentation),
      });

      if (!response.ok) {
        throw new Error(`导出失败：HTTP ${response.status}`);
      }

      // 触发浏览器下载
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "presentation.pptx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
