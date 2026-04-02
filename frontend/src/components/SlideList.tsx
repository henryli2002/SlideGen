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
  default:   "#ffffff",
  dark:      "#1e293b",
  corporate: "#f8fafc",
};

// 缩略图导航列表
export function SlideList({ slides, currentIndex, theme, onSelect }: Props) {
  const bg = bgMap[theme] || bgMap.default;

  if (slides.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎨</div>
        <span>暂无幻灯片</span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "10px 8px",
      overflowY: "auto",
      height: "100%",
    }}>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          onClick={() => onSelect(index)}
          className={`thumb-item${index === currentIndex ? " selected" : ""}`}
          // 每个缩略图按顺序延迟入场
          style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
        >
          {/* 页码标签 */}
          <div className="thumb-badge">
            {index + 1}
          </div>

          {/* 缩略图容器，16:9 */}
          <div style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/9",
            background: bg,
            overflow: "hidden",
          }}>
            <SlideRenderer slide={slide} theme={theme} isThumbnail />
          </div>
        </div>
      ))}
    </div>
  );
}
