import type { Slide } from "../types/schema";
import { SlideRenderer } from "./SlideRenderer";
import "../styles/slides.css";

interface Props {
  slide: Slide | null;
  theme: string;
}

// 幻灯片主画布，强制 16:9 比例
export function SlideCanvas({ slide, theme }: Props) {
  const bgMap: Record<string, string> = {
    default: "#ffffff",
    dark: "#1e293b",
    corporate: "#f8fafc",
  };
  const bg = bgMap[theme] || bgMap.default;

  if (!slide) {
    return (
      <div
        className="slide-canvas"
        style={{ background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 16 }}>输入主题后点击「生成」</p>
          <p style={{ fontSize: 13, opacity: 0.7 }}>AI 将为你创作精美的演示文稿</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="slide-canvas"
      style={{ background: bg }}
    >
      <SlideRenderer slide={slide} theme={theme} />
    </div>
  );
}
