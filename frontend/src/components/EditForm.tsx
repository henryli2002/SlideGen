import type { Slide } from "../types/schema";
import { LAYOUT_NAMES } from "../presets/index";

interface Props {
  slide: Slide | null;
  onUpdate: (slideId: string, newData: Record<string, string>) => void;
}

// ===== 各布局的可编辑字段配置 =====
interface FieldConfig {
  key: string;
  label: string;
  maxLength: number;
  multiline?: boolean;
  placeholder?: string;
}

const FIELD_CONFIG: Record<string, FieldConfig[]> = {
  cover_centered: [
    { key: "title", label: "标题", maxLength: 30, placeholder: "最多 30 字" },
    { key: "subtitle", label: "副标题", maxLength: 60, multiline: true, placeholder: "最多 60 字" },
  ],
  cover_left_bold: [
    { key: "title", label: "标题", maxLength: 30, placeholder: "最多 30 字" },
    { key: "subtitle", label: "副标题", maxLength: 80, multiline: true, placeholder: "最多 80 字" },
  ],
  section_divider: [
    { key: "title", label: "章节标题", maxLength: 20, placeholder: "最多 20 字" },
  ],
  bullets_icon_list: [
    { key: "title", label: "标题", maxLength: 30, placeholder: "最多 30 字" },
    { key: "bullet1", label: "要点 1", maxLength: 40, placeholder: "最多 40 字" },
    { key: "bullet1_icon", label: "图标 1", maxLength: 20, placeholder: "如 check / star / zap" },
    { key: "bullet2", label: "要点 2", maxLength: 40, placeholder: "最多 40 字" },
    { key: "bullet2_icon", label: "图标 2", maxLength: 20, placeholder: "图标名称" },
    { key: "bullet3", label: "要点 3", maxLength: 40, placeholder: "最多 40 字" },
    { key: "bullet3_icon", label: "图标 3", maxLength: 20, placeholder: "图标名称" },
    { key: "bullet4", label: "要点 4（可选）", maxLength: 40, placeholder: "留空则不显示" },
    { key: "bullet4_icon", label: "图标 4", maxLength: 20, placeholder: "图标名称" },
    { key: "bullet5", label: "要点 5（可选）", maxLength: 40, placeholder: "留空则不显示" },
    { key: "bullet5_icon", label: "图标 5", maxLength: 20, placeholder: "图标名称" },
  ],
  bullets_card_grid: [
    { key: "title", label: "标题", maxLength: 30, placeholder: "最多 30 字" },
    { key: "card1_title", label: "卡片 1 标题", maxLength: 15, placeholder: "最多 15 字" },
    { key: "card1_desc", label: "卡片 1 描述", maxLength: 50, multiline: true, placeholder: "最多 50 字" },
    { key: "card2_title", label: "卡片 2 标题", maxLength: 15, placeholder: "最多 15 字" },
    { key: "card2_desc", label: "卡片 2 描述", maxLength: 50, multiline: true, placeholder: "最多 50 字" },
    { key: "card3_title", label: "卡片 3 标题", maxLength: 15, placeholder: "最多 15 字" },
    { key: "card3_desc", label: "卡片 3 描述", maxLength: 50, multiline: true, placeholder: "最多 50 字" },
    { key: "card4_title", label: "卡片 4 标题", maxLength: 15, placeholder: "最多 15 字" },
    { key: "card4_desc", label: "卡片 4 描述", maxLength: 50, multiline: true, placeholder: "最多 50 字" },
  ],
  stats_three_column: [
    { key: "title", label: "标题", maxLength: 30, placeholder: "最多 30 字" },
    { key: "stat1_number", label: "数字 1", maxLength: 10, placeholder: "如 98%" },
    { key: "stat1_label", label: "指标 1 说明", maxLength: 20, placeholder: "最多 20 字" },
    { key: "stat2_number", label: "数字 2", maxLength: 10, placeholder: "如 97M" },
    { key: "stat2_label", label: "指标 2 说明", maxLength: 20, placeholder: "最多 20 字" },
    { key: "stat3_number", label: "数字 3", maxLength: 10, placeholder: "如 40%" },
    { key: "stat3_label", label: "指标 3 说明", maxLength: 20, placeholder: "最多 20 字" },
  ],
  split_two_column: [
    { key: "title", label: "标题", maxLength: 30, placeholder: "最多 30 字" },
    { key: "left_title", label: "左栏标题", maxLength: 15, placeholder: "最多 15 字" },
    { key: "left_content", label: "左栏内容", maxLength: 120, multiline: true, placeholder: "最多 120 字" },
    { key: "right_title", label: "右栏标题", maxLength: 15, placeholder: "最多 15 字" },
    { key: "right_content", label: "右栏内容", maxLength: 120, multiline: true, placeholder: "最多 120 字" },
  ],
  quote_centered: [
    { key: "quote", label: "引言内容", maxLength: 80, multiline: true, placeholder: "最多 80 字" },
    { key: "attribution", label: "出处 / 作者", maxLength: 30, placeholder: "最多 30 字" },
  ],
  timeline_horizontal: [
    { key: "title", label: "标题", maxLength: 30, placeholder: "最多 30 字" },
    { key: "point1_time", label: "节点 1 时间", maxLength: 10, placeholder: "如 2020" },
    { key: "point1_text", label: "节点 1 描述", maxLength: 30, placeholder: "最多 30 字" },
    { key: "point2_time", label: "节点 2 时间", maxLength: 10, placeholder: "如 2022" },
    { key: "point2_text", label: "节点 2 描述", maxLength: 30, placeholder: "最多 30 字" },
    { key: "point3_time", label: "节点 3 时间", maxLength: 10, placeholder: "如 2024" },
    { key: "point3_text", label: "节点 3 描述", maxLength: 30, placeholder: "最多 30 字" },
    { key: "point4_time", label: "节点 4 时间（可选）", maxLength: 10, placeholder: "留空则不显示" },
    { key: "point4_text", label: "节点 4 描述", maxLength: 30, placeholder: "最多 30 字" },
  ],
  closing_cta: [
    { key: "title", label: "结尾标题", maxLength: 20, placeholder: "最多 20 字" },
    { key: "subtitle", label: "副文本", maxLength: 60, multiline: true, placeholder: "最多 60 字" },
    { key: "cta_text", label: "按钮文字", maxLength: 15, placeholder: "最多 15 字" },
  ],
};

// 字数统计
function CharCount({ current, max }: { current: number; max: number }) {
  const over = current > max;
  return (
    <span style={{ fontSize: 11, color: over ? "#ef4444" : "#9ca3af", marginLeft: 6 }}>
      {current}/{max}
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", border: "1px solid #e5e7eb",
  borderRadius: 6, padding: "6px 10px", fontSize: 13, color: "#1f2937",
  outline: "none", lineHeight: 1.5, fontFamily: "inherit",
};

export function EditForm({ slide, onUpdate }: Props) {
  if (!slide) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 16 }}>
        点击左侧缩略图<br />选择要编辑的页面
      </div>
    );
  }

  const fields = FIELD_CONFIG[slide.layout] ?? [];

  const handleChange = (key: string, value: string) => {
    onUpdate(slide.id, { ...slide.data, [key]: value });
  };

  return (
    <div style={{ padding: 14, overflow: "auto", height: "100%" }}>
      {/* 布局类型标签 */}
      <div style={{ marginBottom: 14 }}>
        <span style={{ display: "inline-block", background: "#EFF6FF", color: "#3B82F6", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
          {LAYOUT_NAMES[slide.layout] ?? slide.layout}
        </span>
      </div>

      {/* 动态字段表单 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fields.map((field) => {
          const value = slide.data[field.key] ?? "";
          return (
            <div key={field.key}>
              <label style={labelStyle}>
                {field.label}
                <CharCount current={value.length} max={field.maxLength} />
              </label>
              {field.multiline ? (
                <textarea
                  style={{ ...inputStyle, height: 72, resize: "vertical" }}
                  value={value}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              ) : (
                <input
                  style={inputStyle}
                  value={value}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
