import { useState } from "react";
import type { SSEStatus } from "../hooks/useSSE";

interface Props {
  status: SSEStatus;
  onGenerate: (topic: string, numSlides: number) => void;
  onStop: () => void;
}

export function InputPanel({ status, onGenerate, onStop }: Props) {
  const [topic, setTopic] = useState("");
  const [numSlides, setNumSlides] = useState(6);

  const isLoading = status === "loading";

  const handleGenerate = () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      alert("请输入演示文稿主题");
      return;
    }
    onGenerate(trimmed, numSlides);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleGenerate();
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
      {/* 主题输入框 */}
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={200}
        placeholder="输入演示文稿主题，例如：人工智能的未来发展趋势"
        disabled={isLoading}
        style={{
          flex: 1,
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 14,
          color: "#1f2937",
          outline: "none",
          background: isLoading ? "#f9fafb" : "#ffffff",
          fontFamily: "inherit",
        }}
      />

      {/* 页数选择 */}
      <select
        value={numSlides}
        onChange={(e) => setNumSlides(Number(e.target.value))}
        disabled={isLoading}
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 14,
          color: "#1f2937",
          cursor: isLoading ? "not-allowed" : "pointer",
          background: isLoading ? "#f9fafb" : "#ffffff",
          fontFamily: "inherit",
        }}
      >
        {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <option key={n} value={n}>
            {n} 页
          </option>
        ))}
      </select>

      {/* 生成/停止按钮 */}
      {isLoading ? (
        <button
          onClick={onStop}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: "#fee2e2",
            color: "#ef4444",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          停止生成
        </button>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={!topic.trim()}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: topic.trim() ? "#3B82F6" : "#e5e7eb",
            color: topic.trim() ? "#ffffff" : "#9ca3af",
            fontSize: 14,
            fontWeight: 600,
            cursor: topic.trim() ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
            transition: "background 0.15s",
          }}
        >
          ✨ 生成
        </button>
      )}
    </div>
  );
}
