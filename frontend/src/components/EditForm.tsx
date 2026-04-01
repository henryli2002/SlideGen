import type { Slide, CoverData, BulletsData, SplitData } from "../types/schema";

interface Props {
  slide: Slide | null;
  onUpdate: (slideId: string, newData: Slide["data"]) => void;
}

// 字数统计组件
function CharCount({ current, max }: { current: number; max: number }) {
  const isOver = current > max;
  return (
    <span style={{ fontSize: 11, color: isOver ? "#ef4444" : "#9ca3af", marginLeft: 6 }}>
      {current}/{max}
    </span>
  );
}

// 封面表单
function CoverForm({ slide, onUpdate }: { slide: Slide; onUpdate: Props["onUpdate"] }) {
  const data = slide.data as CoverData;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>
          标题 <CharCount current={data.title.length} max={30} />
        </label>
        <input
          style={inputStyle}
          value={data.title}
          maxLength={30}
          onChange={(e) => onUpdate(slide.id, { ...data, title: e.target.value })}
          placeholder="演示文稿标题（最多 30 字）"
        />
      </div>
      <div>
        <label style={labelStyle}>
          副标题 <CharCount current={data.subtitle.length} max={60} />
        </label>
        <textarea
          style={{ ...inputStyle, height: 80, resize: "vertical" }}
          value={data.subtitle}
          maxLength={60}
          onChange={(e) => onUpdate(slide.id, { ...data, subtitle: e.target.value })}
          placeholder="副标题内容（最多 60 字）"
        />
      </div>
    </div>
  );
}

// 要点表单
function BulletsForm({ slide, onUpdate }: { slide: Slide; onUpdate: Props["onUpdate"] }) {
  const data = slide.data as BulletsData;

  const updateBullet = (index: number, value: string) => {
    const newBullets = [...data.bullets];
    newBullets[index] = value;
    onUpdate(slide.id, { ...data, bullets: newBullets });
  };

  const addBullet = () => {
    if (data.bullets.length >= 6) return;
    onUpdate(slide.id, { ...data, bullets: [...data.bullets, ""] });
  };

  const removeBullet = (index: number) => {
    if (data.bullets.length <= 3) return;
    const newBullets = data.bullets.filter((_, i) => i !== index);
    onUpdate(slide.id, { ...data, bullets: newBullets });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>
          标题 <CharCount current={data.title.length} max={30} />
        </label>
        <input
          style={inputStyle}
          value={data.title}
          maxLength={30}
          onChange={(e) => onUpdate(slide.id, { ...data, title: e.target.value })}
          placeholder="页面标题（最多 30 字）"
        />
      </div>

      <div>
        <label style={labelStyle}>
          要点列表
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>
            {data.bullets.length}/6（最少 3 条）
          </span>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.bullets.map((bullet, index) => (
            <div key={index} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ color: "#9ca3af", fontSize: 13, lineHeight: "32px", minWidth: 20, textAlign: "center" }}>
                {index + 1}
              </span>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={bullet}
                maxLength={40}
                onChange={(e) => updateBullet(index, e.target.value)}
                placeholder={`要点 ${index + 1}（最多 40 字）`}
              />
              <button
                onClick={() => removeBullet(index)}
                disabled={data.bullets.length <= 3}
                style={{
                  ...btnStyle,
                  background: data.bullets.length <= 3 ? "#f3f4f6" : "#fee2e2",
                  color: data.bullets.length <= 3 ? "#d1d5db" : "#ef4444",
                  cursor: data.bullets.length <= 3 ? "not-allowed" : "pointer",
                  width: 30,
                  height: 30,
                  padding: 0,
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {data.bullets.length < 6 && (
          <button
            onClick={addBullet}
            style={{ ...btnStyle, marginTop: 8, color: "#3B82F6", background: "#EFF6FF" }}
          >
            + 添加要点
          </button>
        )}
      </div>
    </div>
  );
}

// 分栏表单
function SplitForm({ slide, onUpdate }: { slide: Slide; onUpdate: Props["onUpdate"] }) {
  const data = slide.data as SplitData;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>
          标题 <CharCount current={data.title.length} max={30} />
        </label>
        <input
          style={inputStyle}
          value={data.title}
          maxLength={30}
          onChange={(e) => onUpdate(slide.id, { ...data, title: e.target.value })}
          placeholder="页面标题（最多 30 字）"
        />
      </div>
      <div>
        <label style={labelStyle}>
          左栏内容 <CharCount current={data.leftContent.length} max={120} />
        </label>
        <textarea
          style={{ ...inputStyle, height: 100, resize: "vertical" }}
          value={data.leftContent}
          maxLength={120}
          onChange={(e) => onUpdate(slide.id, { ...data, leftContent: e.target.value })}
          placeholder="左栏内容（最多 120 字）"
        />
      </div>
      <div>
        <label style={labelStyle}>
          右栏内容 <CharCount current={data.rightContent.length} max={120} />
        </label>
        <textarea
          style={{ ...inputStyle, height: 100, resize: "vertical" }}
          value={data.rightContent}
          maxLength={120}
          onChange={(e) => onUpdate(slide.id, { ...data, rightContent: e.target.value })}
          placeholder="右栏内容（最多 120 字）"
        />
      </div>
    </div>
  );
}

// 公共样式
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 13,
  color: "#1f2937",
  outline: "none",
  lineHeight: "1.5",
  fontFamily: "inherit",
};

const btnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

// 布局标签映射
const LAYOUT_LABEL: Record<string, string> = {
  cover: "封面页",
  bullets: "要点页",
  split: "分栏页",
};

// 主编辑表单组件
export function EditForm({ slide, onUpdate }: Props) {
  if (!slide) {
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
        点击左侧缩略图选择要编辑的页面
      </div>
    );
  }

  return (
    <div style={{ padding: 16, overflow: "auto", height: "100%" }}>
      {/* 布局类型标签 */}
      <div style={{ marginBottom: 16 }}>
        <span
          style={{
            display: "inline-block",
            background: "#EFF6FF",
            color: "#3B82F6",
            borderRadius: 4,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {LAYOUT_LABEL[slide.layout] || slide.layout}
        </span>
      </div>

      {/* 根据 layout 渲染对应表单 */}
      {slide.layout === "cover" && <CoverForm slide={slide} onUpdate={onUpdate} />}
      {slide.layout === "bullets" && <BulletsForm slide={slide} onUpdate={onUpdate} />}
      {slide.layout === "split" && <SplitForm slide={slide} onUpdate={onUpdate} />}
    </div>
  );
}
