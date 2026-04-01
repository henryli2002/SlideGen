import type { SplitData } from "../../types/schema";

interface Props {
  data: SplitData;
  theme: string;
  isThumbnail?: boolean;
}

const THEME_ACCENT: Record<string, string> = {
  default: "#3B82F6",
  dark: "#60A5FA",
  corporate: "#1D4ED8",
};

const THEME_TITLE: Record<string, string> = {
  default: "#1f2937",
  dark: "#f1f5f9",
  corporate: "#0f172a",
};

const THEME_TEXT: Record<string, string> = {
  default: "#374751",
  dark: "#CBD5E1",
  corporate: "#374151",
};

// 左右栏背景色
const LEFT_BG: Record<string, string> = {
  default: "#EFF6FF",
  dark: "#1e3a5f",
  corporate: "#EFF6FF",
};

const RIGHT_BG: Record<string, string> = {
  default: "#F0FDF4",
  dark: "#14532d",
  corporate: "#F0FDF4",
};

export function SplitSlide({ data, theme, isThumbnail }: Props) {
  const accent = THEME_ACCENT[theme] || THEME_ACCENT.default;
  const titleColor = THEME_TITLE[theme] || THEME_TITLE.default;
  const textColor = THEME_TEXT[theme] || THEME_TEXT.default;
  const leftBg = LEFT_BG[theme] || LEFT_BG.default;
  const rightBg = RIGHT_BG[theme] || RIGHT_BG.default;

  return (
    <div className={`slide-base ${isThumbnail ? "slide-thumbnail" : ""}`}>
      {/* 顶部装饰条 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: accent,
        }}
      />

      {/* 标题 */}
      <div style={{ paddingTop: 8 }}>
        <h2 className="slide-title" style={{ color: titleColor }}>
          {data.title}
        </h2>
        <div
          className="slide-divider"
          style={{ background: accent, width: isThumbnail ? 24 : 48 }}
        />
      </div>

      {/* 分栏内容 */}
      <div className="slide-split-container">
        {/* 左栏 */}
        <div
          className="slide-split-panel"
          style={{ background: leftBg }}
        >
          <div
            style={{
              fontSize: isThumbnail ? "clamp(5px, 1vw, 8px)" : "clamp(10px, 1.2vw, 13px)",
              fontWeight: 600,
              color: accent,
              marginBottom: isThumbnail ? 3 : 8,
            }}
          >
            左栏
          </div>
          <p
            className="slide-split-content"
            style={{ color: textColor }}
          >
            {data.leftContent}
          </p>
        </div>

        {/* 右栏 */}
        <div
          className="slide-split-panel"
          style={{ background: rightBg }}
        >
          <div
            style={{
              fontSize: isThumbnail ? "clamp(5px, 1vw, 8px)" : "clamp(10px, 1.2vw, 13px)",
              fontWeight: 600,
              color: accent,
              marginBottom: isThumbnail ? 3 : 8,
            }}
          >
            右栏
          </div>
          <p
            className="slide-split-content"
            style={{ color: textColor }}
          >
            {data.rightContent}
          </p>
        </div>
      </div>
    </div>
  );
}
