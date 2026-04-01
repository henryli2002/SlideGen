import type { BulletsData } from "../../types/schema";

interface Props {
  data: BulletsData;
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

const THEME_BULLET_BG: Record<string, string> = {
  default: "#EFF6FF",
  dark: "#1e3a5f",
  corporate: "#EFF6FF",
};

export function BulletsSlide({ data, theme, isThumbnail }: Props) {
  const accent = THEME_ACCENT[theme] || THEME_ACCENT.default;
  const titleColor = THEME_TITLE[theme] || THEME_TITLE.default;
  const textColor = THEME_TEXT[theme] || THEME_TEXT.default;
  const bulletBg = THEME_BULLET_BG[theme] || THEME_BULLET_BG.default;

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

      {/* 标题区域 */}
      <div style={{ paddingTop: 8 }}>
        <h2 className="slide-title" style={{ color: titleColor }}>
          {data.title}
        </h2>
        <div
          className="slide-divider"
          style={{ background: accent, width: isThumbnail ? 24 : 48 }}
        />
      </div>

      {/* 要点列表 */}
      <ul className="slide-bullets" style={{ marginTop: 8 }}>
        {data.bullets.map((bullet, index) => (
          <li
            key={index}
            style={{
              color: textColor,
              background: bulletBg,
              borderRadius: 6,
              padding: isThumbnail ? "3px 8px 3px 20px" : "8px 16px 8px 36px",
              fontSize: isThumbnail ? "clamp(5px, 1vw, 9px)" : undefined,
            }}
          >
            {/* 自定义序号 */}
            <span
              style={{
                position: "absolute",
                left: isThumbnail ? 6 : 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: isThumbnail ? 12 : 20,
                height: isThumbnail ? 12 : 20,
                background: accent,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: isThumbnail ? 6 : 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {index + 1}
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
