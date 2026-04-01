import type { CoverData } from "../../types/schema";

interface Props {
  data: CoverData;
  theme: string;
  isThumbnail?: boolean;
}

// 各主题的颜色配置
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

const THEME_SUB: Record<string, string> = {
  default: "#374751",
  dark: "#CBD5E1",
  corporate: "#1e40af",
};

export function CoverSlide({ data, theme, isThumbnail }: Props) {
  const accent = THEME_ACCENT[theme] || THEME_ACCENT.default;
  const titleColor = THEME_TITLE[theme] || THEME_TITLE.default;
  const subColor = THEME_SUB[theme] || THEME_SUB.default;

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

      {/* 居中内容 */}
      <div className="slide-cover-inner" style={{ gap: 16 }}>
        {/* 装饰圆圈 */}
        <div
          style={{
            width: isThumbnail ? 24 : 48,
            height: isThumbnail ? 24 : 48,
            borderRadius: "50%",
            background: accent,
            opacity: 0.15,
            position: "absolute",
            top: "10%",
            right: "8%",
          }}
        />
        <div
          style={{
            width: isThumbnail ? 14 : 28,
            height: isThumbnail ? 14 : 28,
            borderRadius: "50%",
            background: accent,
            opacity: 0.1,
            position: "absolute",
            bottom: "15%",
            left: "6%",
          }}
        />

        {/* 标题 */}
        <h1
          className="slide-title"
          style={{
            color: titleColor,
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          {data.title}
        </h1>

        {/* 分隔线 */}
        <div
          className="slide-divider"
          style={{
            background: accent,
            width: isThumbnail ? 32 : 64,
            margin: "4px auto",
          }}
        />

        {/* 副标题 */}
        <p
          className="slide-subtitle"
          style={{
            color: subColor,
            maxWidth: "70%",
          }}
        >
          {data.subtitle}
        </p>
      </div>
    </div>
  );
}
