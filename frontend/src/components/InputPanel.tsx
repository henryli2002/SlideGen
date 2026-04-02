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
  const canGenerate = topic.trim().length > 0 && !isLoading;

  const handleGenerate = () => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    onGenerate(trimmed, numSlides);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canGenerate) {
      handleGenerate();
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      {/* 主题输入框 */}
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={200}
        placeholder="输入演示文稿主题，例如：人工智能的未来发展趋势"
        disabled={isLoading}
        className="topic-input"
      />

      {/* 页数选择 */}
      <select
        value={numSlides}
        onChange={(e) => setNumSlides(Number(e.target.value))}
        disabled={isLoading}
        className="num-select"
      >
        {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <option key={n} value={n}>{n} 页</option>
        ))}
      </select>

      {/* 生成 / 停止按钮 */}
      {isLoading ? (
        <button onClick={onStop} className="btn btn-danger">
          停止生成
        </button>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="btn btn-primary"
        >
          ✦ 生成
        </button>
      )}
    </div>
  );
}
