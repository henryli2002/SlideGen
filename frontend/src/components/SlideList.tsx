import type { Slide } from "../types/schema";
import { SlideRenderer } from "./SlideRenderer";
import "../styles/slides.css";

interface Props {
  slides: Slide[];
  currentIndex: number;
  theme: string;
  onSelect: (index: number) => void;
}

const bgMap: Record<string, string> = {
  default: "#ffffff",
  dark: "#1e293b",
  corporate: "#f8fafc",
};

// 缩略图导航列表
export function SlideList({ slides, currentIndex, theme, onSelect }: Props) {
  const bg = bgMap[theme] || bgMap.default;

  if (slides.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#9ca3af",
          fontSize: 13,
          textAlign: "center",
          padding: 16,
        }}
      >
        暂无幻灯片
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 8px",
        overflowY: "auto",
        height: "100%",
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          onClick={() => onSelect(index)}
          style={{
            cursor: "pointer",
            borderRadius: 6,
            overflow: "hidden",
            border: index === currentIndex ? "2px solid #3B82F6" : "2px solid transparent",
            boxShadow: index === currentIndex
              ? "0 0 0 1px #3B82F6"
              : "0 1px 4px rgba(0,0,0,0.12)",
            transition: "border-color 0.15s, box-shadow 0.15s",
            flexShrink: 0,
          }}
        >
          {/* 页码标签 */}
          <div
            style={{
              background: index === currentIndex ? "#3B82F6" : "#6b7280",
              color: "#fff",
              fontSize: 10,
              padding: "2px 6px",
              fontWeight: 600,
            }}
          >
            {index + 1}
          </div>

          {/* 缩略图容器，16:9 */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              background: bg,
              overflow: "hidden",
            }}
          >
            <SlideRenderer slide={slide} theme={theme} isThumbnail />
          </div>
        </div>
      ))}
    </div>
  );
}
