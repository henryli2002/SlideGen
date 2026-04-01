// ===== 幻灯片布局预设定义 =====
// 与 backend/app/layout_presets/*.json 保持同步
// 坐标 x/y/w/h 均为百分比（相对于画布宽/高）

export interface PresetElement {
  role: string;
  type: "shape" | "text" | "icon";
  x: number;
  y: number;
  w: number;
  h: number;
  // shape 专属
  shape?: "rectangle" | "rounded-rect" | "circle";
  fillColor?: string;
  opacity?: number;
  borderRadius?: number;
  // text 专属
  content?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  color?: string;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  lineHeight?: number;
  // icon 专属
  icon?: string;
  zIndex?: number;
}

export interface PresetDefinition {
  presetId: string;
  name: string;
  category: string;
  elements: PresetElement[];
}

// ---------- cover_centered ----------
const coverCentered: PresetDefinition = {
  presetId: "cover_centered",
  name: "居中封面",
  category: "cover",
  elements: [
    { role: "bg_accent", type: "shape", shape: "rectangle", x: 0, y: 88, w: 100, h: 12, fillColor: "{{accentColor}}", opacity: 0.12, zIndex: 0 },
    { role: "accent_line", type: "shape", shape: "rectangle", x: 35, y: 47, w: 30, h: 0.5, fillColor: "{{accentColor}}", zIndex: 1 },
    { role: "title", type: "text", x: 10, y: 22, w: 80, h: 22, content: "{{title}}", fontSize: 44, fontWeight: "bold", color: "{{titleColor}}", textAlign: "center", verticalAlign: "middle", zIndex: 2 },
    { role: "subtitle", type: "text", x: 10, y: 50, w: 80, h: 20, content: "{{subtitle}}", fontSize: 22, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
  ],
};

// ---------- cover_left_bold ----------
const coverLeftBold: PresetDefinition = {
  presetId: "cover_left_bold",
  name: "左对齐封面",
  category: "cover",
  elements: [
    { role: "right_accent", type: "shape", shape: "rectangle", x: 65, y: 0, w: 35, h: 100, fillColor: "{{accentColor}}", opacity: 0.1, zIndex: 0 },
    { role: "right_accent_dark", type: "shape", shape: "rectangle", x: 65, y: 0, w: 2, h: 100, fillColor: "{{accentColor}}", opacity: 0.6, zIndex: 1 },
    { role: "accent_bar", type: "shape", shape: "rectangle", x: 5, y: 17, w: 6, h: 1.5, fillColor: "{{accentColor}}", zIndex: 2 },
    { role: "title", type: "text", x: 5, y: 21, w: 58, h: 28, content: "{{title}}", fontSize: 42, fontWeight: "bold", color: "{{titleColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 3 },
    { role: "subtitle", type: "text", x: 5, y: 52, w: 58, h: 25, content: "{{subtitle}}", fontSize: 20, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "top", lineHeight: 1.5, zIndex: 3 },
  ],
};

// ---------- section_divider ----------
const sectionDivider: PresetDefinition = {
  presetId: "section_divider",
  name: "章节分隔",
  category: "divider",
  elements: [
    { role: "bg_circle", type: "shape", shape: "circle", x: 32, y: 8, w: 36, h: 64, fillColor: "{{accentColor}}", opacity: 0.06, zIndex: 0 },
    { role: "accent_line_top", type: "shape", shape: "rectangle", x: 38, y: 30, w: 24, h: 0.5, fillColor: "{{accentColor}}", zIndex: 1 },
    { role: "title", type: "text", x: 10, y: 33, w: 80, h: 26, content: "{{title}}", fontSize: 48, fontWeight: "bold", color: "{{titleColor}}", textAlign: "center", verticalAlign: "middle", zIndex: 2 },
    { role: "accent_line_bottom", type: "shape", shape: "rectangle", x: 38, y: 61, w: 24, h: 0.5, fillColor: "{{accentColor}}", zIndex: 1 },
  ],
};

// ---------- bullets_icon_list ----------
const bulletsIconList: PresetDefinition = {
  presetId: "bullets_icon_list",
  name: "图标要点列表",
  category: "bullets",
  elements: [
    { role: "accent_bar", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 1.5, fillColor: "{{accentColor}}", zIndex: 0 },
    { role: "title", type: "text", x: 5, y: 3, w: 90, h: 16, content: "{{title}}", fontSize: 32, fontWeight: "bold", color: "{{titleColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "icon_1", type: "icon", x: 5, y: 23, w: 5, h: 9, icon: "{{bullet1_icon}}", color: "{{accentColor}}", zIndex: 1 },
    { role: "bullet_1", type: "text", x: 12, y: 23, w: 83, h: 9, content: "{{bullet1}}", fontSize: 20, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "icon_2", type: "icon", x: 5, y: 35, w: 5, h: 9, icon: "{{bullet2_icon}}", color: "{{accentColor}}", zIndex: 1 },
    { role: "bullet_2", type: "text", x: 12, y: 35, w: 83, h: 9, content: "{{bullet2}}", fontSize: 20, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "icon_3", type: "icon", x: 5, y: 47, w: 5, h: 9, icon: "{{bullet3_icon}}", color: "{{accentColor}}", zIndex: 1 },
    { role: "bullet_3", type: "text", x: 12, y: 47, w: 83, h: 9, content: "{{bullet3}}", fontSize: 20, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "icon_4", type: "icon", x: 5, y: 59, w: 5, h: 9, icon: "{{bullet4_icon}}", color: "{{accentColor}}", zIndex: 1 },
    { role: "bullet_4", type: "text", x: 12, y: 59, w: 83, h: 9, content: "{{bullet4}}", fontSize: 20, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "icon_5", type: "icon", x: 5, y: 71, w: 5, h: 9, icon: "{{bullet5_icon}}", color: "{{accentColor}}", zIndex: 1 },
    { role: "bullet_5", type: "text", x: 12, y: 71, w: 83, h: 9, content: "{{bullet5}}", fontSize: 20, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
  ],
};

// ---------- bullets_card_grid ----------
const bulletsCardGrid: PresetDefinition = {
  presetId: "bullets_card_grid",
  name: "卡片网格",
  category: "bullets",
  elements: [
    { role: "accent_bar", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 1.5, fillColor: "{{accentColor}}", zIndex: 0 },
    { role: "title", type: "text", x: 5, y: 3, w: 90, h: 16, content: "{{title}}", fontSize: 32, fontWeight: "bold", color: "{{titleColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "card1_bg", type: "shape", shape: "rounded-rect", x: 3, y: 21, w: 45, h: 36, fillColor: "{{accentColor}}", opacity: 0.1, borderRadius: 8, zIndex: 1 },
    { role: "card1_title", type: "text", x: 5, y: 23, w: 41, h: 10, content: "{{card1_title}}", fontSize: 20, fontWeight: "bold", color: "{{accentColor}}", textAlign: "left", verticalAlign: "top", zIndex: 2 },
    { role: "card1_desc", type: "text", x: 5, y: 34, w: 41, h: 22, content: "{{card1_desc}}", fontSize: 15, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
    { role: "card2_bg", type: "shape", shape: "rounded-rect", x: 52, y: 21, w: 45, h: 36, fillColor: "{{accentColor}}", opacity: 0.1, borderRadius: 8, zIndex: 1 },
    { role: "card2_title", type: "text", x: 54, y: 23, w: 41, h: 10, content: "{{card2_title}}", fontSize: 20, fontWeight: "bold", color: "{{accentColor}}", textAlign: "left", verticalAlign: "top", zIndex: 2 },
    { role: "card2_desc", type: "text", x: 54, y: 34, w: 41, h: 22, content: "{{card2_desc}}", fontSize: 15, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
    { role: "card3_bg", type: "shape", shape: "rounded-rect", x: 3, y: 60, w: 45, h: 36, fillColor: "{{accentColor}}", opacity: 0.1, borderRadius: 8, zIndex: 1 },
    { role: "card3_title", type: "text", x: 5, y: 62, w: 41, h: 10, content: "{{card3_title}}", fontSize: 20, fontWeight: "bold", color: "{{accentColor}}", textAlign: "left", verticalAlign: "top", zIndex: 2 },
    { role: "card3_desc", type: "text", x: 5, y: 73, w: 41, h: 22, content: "{{card3_desc}}", fontSize: 15, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
    { role: "card4_bg", type: "shape", shape: "rounded-rect", x: 52, y: 60, w: 45, h: 36, fillColor: "{{accentColor}}", opacity: 0.1, borderRadius: 8, zIndex: 1 },
    { role: "card4_title", type: "text", x: 54, y: 62, w: 41, h: 10, content: "{{card4_title}}", fontSize: 20, fontWeight: "bold", color: "{{accentColor}}", textAlign: "left", verticalAlign: "top", zIndex: 2 },
    { role: "card4_desc", type: "text", x: 54, y: 73, w: 41, h: 22, content: "{{card4_desc}}", fontSize: 15, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
  ],
};

// ---------- stats_three_column ----------
const statsThreeColumn: PresetDefinition = {
  presetId: "stats_three_column",
  name: "三列数据统计",
  category: "data",
  elements: [
    { role: "accent_bar", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 1.5, fillColor: "{{accentColor}}", zIndex: 0 },
    { role: "title", type: "text", x: 5, y: 3, w: 90, h: 16, content: "{{title}}", fontSize: 32, fontWeight: "bold", color: "{{titleColor}}", textAlign: "center", verticalAlign: "middle", zIndex: 1 },
    { role: "divider", type: "shape", shape: "rectangle", x: 5, y: 21, w: 90, h: 0.4, fillColor: "{{accentColor}}", opacity: 0.3, zIndex: 1 },
    { role: "stat1_bg", type: "shape", shape: "rounded-rect", x: 5, y: 26, w: 28, h: 55, fillColor: "{{accentColor}}", opacity: 0.08, borderRadius: 10, zIndex: 1 },
    { role: "stat1_number", type: "text", x: 5, y: 30, w: 28, h: 25, content: "{{stat1_number}}", fontSize: 52, fontWeight: "bold", color: "{{accentColor}}", textAlign: "center", verticalAlign: "middle", zIndex: 2 },
    { role: "stat1_label", type: "text", x: 5, y: 57, w: 28, h: 18, content: "{{stat1_label}}", fontSize: 16, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.4, zIndex: 2 },
    { role: "stat2_bg", type: "shape", shape: "rounded-rect", x: 36, y: 26, w: 28, h: 55, fillColor: "{{accentColor}}", opacity: 0.08, borderRadius: 10, zIndex: 1 },
    { role: "stat2_number", type: "text", x: 36, y: 30, w: 28, h: 25, content: "{{stat2_number}}", fontSize: 52, fontWeight: "bold", color: "{{accentColor}}", textAlign: "center", verticalAlign: "middle", zIndex: 2 },
    { role: "stat2_label", type: "text", x: 36, y: 57, w: 28, h: 18, content: "{{stat2_label}}", fontSize: 16, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.4, zIndex: 2 },
    { role: "stat3_bg", type: "shape", shape: "rounded-rect", x: 67, y: 26, w: 28, h: 55, fillColor: "{{accentColor}}", opacity: 0.08, borderRadius: 10, zIndex: 1 },
    { role: "stat3_number", type: "text", x: 67, y: 30, w: 28, h: 25, content: "{{stat3_number}}", fontSize: 52, fontWeight: "bold", color: "{{accentColor}}", textAlign: "center", verticalAlign: "middle", zIndex: 2 },
    { role: "stat3_label", type: "text", x: 67, y: 57, w: 28, h: 18, content: "{{stat3_label}}", fontSize: 16, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.4, zIndex: 2 },
  ],
};

// ---------- split_two_column ----------
const splitTwoColumn: PresetDefinition = {
  presetId: "split_two_column",
  name: "双栏对比",
  category: "split",
  elements: [
    { role: "accent_bar", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 1.5, fillColor: "{{accentColor}}", zIndex: 0 },
    { role: "title", type: "text", x: 5, y: 3, w: 90, h: 16, content: "{{title}}", fontSize: 32, fontWeight: "bold", color: "{{titleColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "left_bg", type: "shape", shape: "rounded-rect", x: 3, y: 22, w: 45, h: 73, fillColor: "{{accentColor}}", opacity: 0.1, borderRadius: 8, zIndex: 1 },
    { role: "left_title", type: "text", x: 5, y: 24, w: 41, h: 12, content: "{{left_title}}", fontSize: 22, fontWeight: "bold", color: "{{accentColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 2 },
    { role: "left_content", type: "text", x: 5, y: 38, w: 41, h: 54, content: "{{left_content}}", fontSize: 16, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "top", lineHeight: 1.6, zIndex: 2 },
    { role: "right_bg", type: "shape", shape: "rounded-rect", x: 52, y: 22, w: 45, h: 73, fillColor: "{{accentColor}}", opacity: 0.05, borderRadius: 8, zIndex: 1 },
    { role: "right_title", type: "text", x: 54, y: 24, w: 41, h: 12, content: "{{right_title}}", fontSize: 22, fontWeight: "bold", color: "{{titleColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 2 },
    { role: "right_content", type: "text", x: 54, y: 38, w: 41, h: 54, content: "{{right_content}}", fontSize: 16, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "left", verticalAlign: "top", lineHeight: 1.6, zIndex: 2 },
  ],
};

// ---------- quote_centered ----------
const quoteCentered: PresetDefinition = {
  presetId: "quote_centered",
  name: "居中引用",
  category: "text",
  elements: [
    { role: "quote_mark_bg", type: "text", x: 8, y: 5, w: 18, h: 28, content: "\u201c", fontSize: 120, fontWeight: "bold", color: "{{accentColor}}", textAlign: "left", verticalAlign: "top", opacity: 0.25, zIndex: 0 },
    { role: "quote", type: "text", x: 10, y: 20, w: 80, h: 48, content: "{{quote}}", fontSize: 26, fontWeight: "normal", color: "{{titleColor}}", textAlign: "center", verticalAlign: "middle", lineHeight: 1.7, zIndex: 1 },
    { role: "accent_line", type: "shape", shape: "rectangle", x: 40, y: 70, w: 20, h: 0.5, fillColor: "{{accentColor}}", zIndex: 2 },
    { role: "attribution", type: "text", x: 10, y: 73, w: 80, h: 14, content: "{{attribution}}", fontSize: 18, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", zIndex: 2 },
  ],
};

// ---------- timeline_horizontal ----------
const timelineHorizontal: PresetDefinition = {
  presetId: "timeline_horizontal",
  name: "横向时间线",
  category: "data",
  elements: [
    { role: "accent_bar", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 1.5, fillColor: "{{accentColor}}", zIndex: 0 },
    { role: "title", type: "text", x: 5, y: 3, w: 90, h: 16, content: "{{title}}", fontSize: 32, fontWeight: "bold", color: "{{titleColor}}", textAlign: "left", verticalAlign: "middle", zIndex: 1 },
    { role: "timeline_line", type: "shape", shape: "rectangle", x: 5, y: 46, w: 90, h: 0.8, fillColor: "{{accentColor}}", opacity: 0.4, zIndex: 1 },
    { role: "dot_1", type: "shape", shape: "circle", x: 13, y: 43, w: 3, h: 5.5, fillColor: "{{accentColor}}", zIndex: 2 },
    { role: "point1_time", type: "text", x: 7, y: 51, w: 18, h: 10, content: "{{point1_time}}", fontSize: 18, fontWeight: "bold", color: "{{accentColor}}", textAlign: "center", verticalAlign: "top", zIndex: 2 },
    { role: "point1_text", type: "text", x: 7, y: 62, w: 18, h: 28, content: "{{point1_text}}", fontSize: 14, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
    { role: "dot_2", type: "shape", shape: "circle", x: 35, y: 43, w: 3, h: 5.5, fillColor: "{{accentColor}}", zIndex: 2 },
    { role: "point2_time", type: "text", x: 28, y: 51, w: 18, h: 10, content: "{{point2_time}}", fontSize: 18, fontWeight: "bold", color: "{{accentColor}}", textAlign: "center", verticalAlign: "top", zIndex: 2 },
    { role: "point2_text", type: "text", x: 28, y: 62, w: 18, h: 28, content: "{{point2_text}}", fontSize: 14, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
    { role: "dot_3", type: "shape", shape: "circle", x: 57, y: 43, w: 3, h: 5.5, fillColor: "{{accentColor}}", zIndex: 2 },
    { role: "point3_time", type: "text", x: 50, y: 51, w: 18, h: 10, content: "{{point3_time}}", fontSize: 18, fontWeight: "bold", color: "{{accentColor}}", textAlign: "center", verticalAlign: "top", zIndex: 2 },
    { role: "point3_text", type: "text", x: 50, y: 62, w: 18, h: 28, content: "{{point3_text}}", fontSize: 14, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
    { role: "dot_4", type: "shape", shape: "circle", x: 79, y: 43, w: 3, h: 5.5, fillColor: "{{accentColor}}", zIndex: 2 },
    { role: "point4_time", type: "text", x: 72, y: 51, w: 18, h: 10, content: "{{point4_time}}", fontSize: 18, fontWeight: "bold", color: "{{accentColor}}", textAlign: "center", verticalAlign: "top", zIndex: 2 },
    { role: "point4_text", type: "text", x: 72, y: 62, w: 18, h: 28, content: "{{point4_text}}", fontSize: 14, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "top", lineHeight: 1.5, zIndex: 2 },
  ],
};

// ---------- closing_cta ----------
const closingCta: PresetDefinition = {
  presetId: "closing_cta",
  name: "结尾行动号召",
  category: "cover",
  elements: [
    { role: "bg_tint", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 100, fillColor: "{{accentColor}}", opacity: 0.06, zIndex: 0 },
    { role: "accent_top", type: "shape", shape: "rectangle", x: 0, y: 0, w: 100, h: 1.5, fillColor: "{{accentColor}}", zIndex: 1 },
    { role: "accent_bottom", type: "shape", shape: "rectangle", x: 0, y: 98.5, w: 100, h: 1.5, fillColor: "{{accentColor}}", zIndex: 1 },
    { role: "title", type: "text", x: 10, y: 18, w: 80, h: 26, content: "{{title}}", fontSize: 48, fontWeight: "bold", color: "{{titleColor}}", textAlign: "center", verticalAlign: "middle", zIndex: 2 },
    { role: "subtitle", type: "text", x: 10, y: 47, w: 80, h: 18, content: "{{subtitle}}", fontSize: 20, fontWeight: "normal", color: "{{bodyColor}}", textAlign: "center", verticalAlign: "middle", lineHeight: 1.5, zIndex: 2 },
    { role: "cta_bg", type: "shape", shape: "rounded-rect", x: 35, y: 70, w: 30, h: 14, fillColor: "{{accentColor}}", borderRadius: 24, zIndex: 2 },
    { role: "cta_text", type: "text", x: 35, y: 70, w: 30, h: 14, content: "{{cta_text}}", fontSize: 20, fontWeight: "bold", color: "#ffffff", textAlign: "center", verticalAlign: "middle", zIndex: 3 },
  ],
};

// ===== 全局预设注册表 =====
export const PRESETS: Record<string, PresetDefinition> = {
  cover_centered: coverCentered,
  cover_left_bold: coverLeftBold,
  section_divider: sectionDivider,
  bullets_icon_list: bulletsIconList,
  bullets_card_grid: bulletsCardGrid,
  stats_three_column: statsThreeColumn,
  split_two_column: splitTwoColumn,
  quote_centered: quoteCentered,
  timeline_horizontal: timelineHorizontal,
  closing_cta: closingCta,
};

// ===== 主题颜色配置 =====
export const THEME_COLORS: Record<string, Record<string, string>> = {
  default: {
    accentColor: "#3B82F6",
    titleColor: "#1F2937",
    bodyColor: "#374151",
    bgColor: "#FFFFFF",
  },
  dark: {
    accentColor: "#60A5FA",
    titleColor: "#F1F5F9",
    bodyColor: "#CBD5E1",
    bgColor: "#1E293B",
  },
  corporate: {
    accentColor: "#1D4ED8",
    titleColor: "#0F172A",
    bodyColor: "#374151",
    bgColor: "#F8FAFC",
  },
};

// ===== 布局中文名称映射 =====
export const LAYOUT_NAMES: Record<string, string> = {
  cover_centered: "居中封面",
  cover_left_bold: "左对齐封面",
  section_divider: "章节分隔",
  bullets_icon_list: "图标要点",
  bullets_card_grid: "卡片网格",
  stats_three_column: "数据统计",
  split_two_column: "双栏对比",
  quote_centered: "居中引言",
  timeline_horizontal: "时间线",
  closing_cta: "结尾号召",
};
