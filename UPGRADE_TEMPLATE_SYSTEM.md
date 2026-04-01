# 模板多样性升级方案 — 从固定 Layout 到自由画布

> 本文件是对 CLAUDE_CODE_PROMPT.md 的增量升级，重点解决"模板单一、无法调整位置"的问题。

---

## 一、问题诊断

当前架构的瓶颈：

| 问题 | 根因 |
|------|------|
| 只有 3 种布局，视觉单调 | layout 枚举写死了 cover/bullets/split |
| 无法拖拽调整文本框位置 | 前端按 layout 类型硬编码 CSS，没有坐标系 |
| 导出依赖占位符 | python-pptx 用 SlideLayout 的 placeholder，位置由 .pptx 模板决定 |
| 新增布局成本高 | 每加一种 layout，前后端都要改代码 |

**根本原因：** 当前 JSON Schema 只描述"语义"（这是封面页/要点页），不描述"视觉"（标题在哪、多大、什么颜色）。

---

## 二、升级思路：Element-Based 自由画布

### 2.1 新 JSON Schema

```typescript
// ===== 升级后的核心数据契约 =====

/** 画布坐标系：基于 960×540 的虚拟画布（16:9），所有数值为百分比 */

export interface Presentation {
  schemaVersion: "2.0";
  theme: Theme;
  slides: Slide[];
}

export interface Theme {
  name: string;
  backgroundColor: string;        // 默认幻灯片背景色
  titleColor: string;
  bodyColor: string;
  accentColor: string;            // 强调色（用于装饰元素、图标背景等）
  fontFamily: string;             // 主字体
  fontFamilyHeading?: string;     // 标题字体（可选，不设则同主字体）
}

export interface Slide {
  id: string;
  label: string;                  // 用于缩略图显示，如"封面"、"核心观点"
  backgroundColor?: string;       // 单页背景色覆盖（可选）
  backgroundGradient?: string;    // CSS 渐变字符串（可选，优先于纯色）
  elements: SlideElement[];
}

// ===== 元素类型 =====

export type SlideElement =
  | TextElement
  | ShapeElement
  | IconElement;

interface BaseElement {
  id: string;
  type: string;
  /** 定位：均为百分比（0~100），相对于 960×540 虚拟画布 */
  x: number;       // 左边距 %
  y: number;       // 上边距 %
  w: number;       // 宽度 %
  h: number;       // 高度 %
  rotation?: number;  // 旋转角度（度），默认 0
  opacity?: number;   // 0~1，默认 1
  zIndex?: number;    // 层级，默认 0
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontSize: number;           // 基准字号（px，基于 960px 宽度）
  fontWeight: "normal" | "bold" | "light";
  color?: string;             // 覆盖 theme 颜色
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight?: number;        // 行高倍数，默认 1.4
  letterSpacing?: number;     // 字间距（em），默认 0
  textTransform?: "none" | "uppercase";
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: "rectangle" | "circle" | "line" | "rounded-rect";
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;       // px
  borderRadius?: number;      // px，仅 rounded-rect 有效
}

export interface IconElement extends BaseElement {
  type: "icon";
  /** Lucide 图标名称，如 "rocket", "brain", "chart-bar" */
  icon: string;
  color?: string;
  strokeWidth?: number;
}
```

### 2.2 新旧对比

**旧 Schema（v1.0）— 语义驱动：**
```json
{
  "layout": "bullets",
  "data": {
    "title": "AI 的三大趋势",
    "bullets": ["多模态融合", "Agent 自主化", "端侧部署"]
  }
}
```

**新 Schema（v2.0）— 视觉驱动：**
```json
{
  "id": "slide-2",
  "label": "核心趋势",
  "backgroundColor": "#0a0a1a",
  "elements": [
    {
      "id": "el-1", "type": "shape", "shape": "rounded-rect",
      "x": 5, "y": 5, "w": 90, "h": 18,
      "fillColor": "#6366f1", "borderRadius": 8
    },
    {
      "id": "el-2", "type": "text",
      "x": 8, "y": 7, "w": 84, "h": 14,
      "content": "AI 的三大趋势",
      "fontSize": 36, "fontWeight": "bold",
      "color": "#ffffff", "textAlign": "left", "verticalAlign": "middle"
    },
    {
      "id": "el-3", "type": "icon",
      "x": 8, "y": 32, "w": 6, "h": 10,
      "icon": "brain", "color": "#818cf8"
    },
    {
      "id": "el-4", "type": "text",
      "x": 16, "y": 32, "w": 75, "h": 10,
      "content": "多模态融合：视觉、语言、音频的统一理解",
      "fontSize": 22, "fontWeight": "normal",
      "color": "#e2e8f0", "textAlign": "left", "verticalAlign": "middle"
    },
    {
      "id": "el-5", "type": "icon",
      "x": 8, "y": 48, "w": 6, "h": 10,
      "icon": "bot", "color": "#818cf8"
    },
    {
      "id": "el-6", "type": "text",
      "x": 16, "y": 48, "w": 75, "h": 10,
      "content": "Agent 自主化：从工具到自主决策体",
      "fontSize": 22, "fontWeight": "normal",
      "color": "#e2e8f0", "textAlign": "left", "verticalAlign": "middle"
    },
    {
      "id": "el-7", "type": "icon",
      "x": 8, "y": 64, "w": 6, "h": 10,
      "icon": "smartphone", "color": "#818cf8"
    },
    {
      "id": "el-8", "type": "text",
      "x": 16, "y": 64, "w": 75, "h": 10,
      "content": "端侧部署：大模型走向移动设备",
      "fontSize": 22, "fontWeight": "normal",
      "color": "#e2e8f0", "textAlign": "left", "verticalAlign": "middle"
    }
  ]
}
```

视觉效果的丰富度和自由度完全不在一个量级。

---

## 三、预设模板系统（Layout Preset）

虽然 Schema 是自由画布，但大模型不需要从零计算坐标。我们通过"预设模板库"来引导它。

### 3.1 模板库设计

在后端维护一个 `layout_presets/` 目录，每个预设是一个 JSON 文件：

```
backend/app/layout_presets/
├── cover_centered.json          # 封面：标题居中大字
├── cover_left_bold.json         # 封面：标题左对齐 + 右侧装饰
├── cover_gradient_split.json    # 封面：渐变背景 + 分区
├── bullets_icon_list.json       # 要点：图标 + 文字列表
├── bullets_card_grid.json       # 要点：卡片网格排列
├── bullets_numbered.json        # 要点：大数字编号列表
├── split_two_column.json        # 分栏：左文右文
├── split_image_text.json        # 分栏：左图右文（图用色块占位）
├── quote_centered.json          # 引用：大字居中引言
├── stats_three_column.json      # 数据：三列大数字统计
├── timeline_horizontal.json     # 时间线：横向时间轴
├── section_divider.json         # 章节分隔页
├── closing_cta.json             # 结尾页：行动号召
└── _index.json                  # 模板索引（名称 + 适用场景描述）
```

**单个预设文件示例（`stats_three_column.json`）：**
```json
{
  "presetId": "stats_three_column",
  "name": "三列数据统计",
  "description": "适用于展示 3 个关键数字/指标，视觉冲击力强",
  "category": "data",
  "elements": [
    {
      "role": "title",
      "type": "text",
      "x": 5, "y": 5, "w": 90, "h": 15,
      "fontSize": 32, "fontWeight": "bold",
      "textAlign": "center", "verticalAlign": "middle",
      "content": "{{title}}"
    },
    {
      "role": "stat_number_1",
      "type": "text",
      "x": 5, "y": 35, "w": 28, "h": 20,
      "fontSize": 56, "fontWeight": "bold",
      "textAlign": "center", "verticalAlign": "middle",
      "color": "{{accentColor}}",
      "content": "{{stat1_number}}"
    },
    {
      "role": "stat_label_1",
      "type": "text",
      "x": 5, "y": 58, "w": 28, "h": 12,
      "fontSize": 18, "fontWeight": "normal",
      "textAlign": "center", "verticalAlign": "top",
      "content": "{{stat1_label}}"
    },
    {
      "role": "stat_number_2",
      "type": "text",
      "x": 36, "y": 35, "w": 28, "h": 20,
      "fontSize": 56, "fontWeight": "bold",
      "textAlign": "center", "verticalAlign": "middle",
      "color": "{{accentColor}}",
      "content": "{{stat2_number}}"
    },
    {
      "role": "stat_label_2",
      "type": "text",
      "x": 36, "y": 58, "w": 28, "h": 12,
      "fontSize": 18, "fontWeight": "normal",
      "textAlign": "center", "verticalAlign": "top",
      "content": "{{stat2_label}}"
    },
    {
      "role": "stat_number_3",
      "type": "text",
      "x": 67, "y": 35, "w": 28, "h": 20,
      "fontSize": 56, "fontWeight": "bold",
      "textAlign": "center", "verticalAlign": "middle",
      "color": "{{accentColor}}",
      "content": "{{stat3_number}}"
    },
    {
      "role": "stat_label_3",
      "type": "text",
      "x": 67, "y": 58, "w": 28, "h": 12,
      "fontSize": 18, "fontWeight": "normal",
      "textAlign": "center", "verticalAlign": "top",
      "content": "{{stat3_label}}"
    }
  ]
}
```

### 3.2 两步生成法（推荐）

**Step 1 — 内容规划（大模型）：**

大模型不需要操心坐标，只需要决定每页用哪个 preset 并填充内容：

```
给大模型的 System Prompt（Step 1）：

你是演示文稿内容架构师。根据用户主题，为每一页选择最合适的模板并填充内容。

可用模板列表：
- cover_centered: 封面，标题居中
- cover_left_bold: 封面，标题左对齐，适合副标题较长的情况
- bullets_icon_list: 要点列表，每条带图标
- bullets_card_grid: 卡片式要点，适合 3~4 个并列概念
- stats_three_column: 三列数据统计，适合展示数字
- split_two_column: 双栏对比
- quote_centered: 引用金句页
- timeline_horizontal: 时间线
- section_divider: 章节过渡页
- closing_cta: 结尾行动号召

输出格式（逐页，用 ---SLIDE_BREAK--- 分隔）：
{"preset": "模板名", "fills": {"title": "...", "bullet1": "...", ...}}
```

**Step 2 — 布局渲染（代码，非大模型）：**

后端拿到 Step 1 的结果后，用纯代码将 fills 注入 preset 的 `{{placeholder}}`，生成最终的 elements 数组。这一步零 token 消耗，速度极快。

---

## 四、前端拖拽编辑实现

### 4.1 画布渲染器升级

```tsx
// SlideCanvas.tsx — 自由画布渲染器

function SlideCanvas({ slide, selectedId, onSelect, onUpdate }: Props) {
  // 虚拟画布基准尺寸
  const BASE_W = 960;
  const BASE_H = 540;

  return (
    <div
      className="canvas-container"
      style={{ aspectRatio: "16/9", position: "relative", overflow: "hidden" }}
    >
      {slide.elements.map(el => (
        <DraggableElement
          key={el.id}
          element={el}
          isSelected={el.id === selectedId}
          onSelect={() => onSelect(el.id)}
          onUpdate={(patch) => onUpdate(slide.id, el.id, patch)}
          baseWidth={BASE_W}
        />
      ))}
    </div>
  );
}
```

### 4.2 拖拽元素组件

```tsx
// DraggableElement.tsx — 可拖拽的画布元素

function DraggableElement({ element, isSelected, onSelect, onUpdate }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // 将百分比转为 CSS
  const style: CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.w}%`,
    height: `${element.h}%`,
    cursor: isSelected ? "move" : "pointer",
    outline: isSelected ? "2px solid #6366f1" : "none",
    zIndex: element.zIndex ?? 0,
    opacity: element.opacity ?? 1,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
  };

  // 拖拽处理（简化版，生产建议用 @dnd-kit/core 或 react-draggable）
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelected) { onSelect(); return; }
    e.preventDefault();
    setDragging(true);

    const canvas = elRef.current!.parentElement!;
    const canvasRect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = element.x;
    const startElY = element.y;

    const handleMove = (e: MouseEvent) => {
      const dx = ((e.clientX - startX) / canvasRect.width) * 100;
      const dy = ((e.clientY - startY) / canvasRect.height) * 100;
      onUpdate({ x: startElX + dx, y: startElY + dy });
    };

    const handleUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <div ref={elRef} style={style} onMouseDown={handleMouseDown}>
      {element.type === "text" && <TextRenderer element={element} />}
      {element.type === "shape" && <ShapeRenderer element={element} />}
      {element.type === "icon" && <IconRenderer element={element} />}
    </div>
  );
}
```

### 4.3 属性编辑面板升级

右侧面板不再是固定表单，而是根据选中元素类型动态渲染属性面板：

```
选中 TextElement 时显示：
├── 内容（多行文本框）
├── 字号（滑块 12~72）
├── 字重（下拉：light/normal/bold）
├── 颜色（色板选择器）
├── 对齐（左/中/右 三个图标按钮）
├── 位置（x, y 数字输入框）
└── 尺寸（w, h 数字输入框）

选中 ShapeElement 时显示：
├── 形状（下拉选择）
├── 填充色
├── 边框色 + 边框宽度
├── 圆角（仅 rounded-rect）
├── 位置与尺寸
└── 旋转角度

选中 IconElement 时显示：
├── 图标搜索（输入关键词，从 Lucide 图标库筛选）
├── 颜色
├── 线条粗细
└── 位置与尺寸
```

---

## 五、python-pptx 导出适配

导出逻辑从"匹配占位符"改为"绝对坐标创建元素"：

```python
# pptx_service.py — 升级后的导出逻辑

from pptx import Presentation as PptxPresentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

# PPT 标准尺寸（英寸）
SLIDE_WIDTH_INCHES = 13.333   # 标准 16:9 宽屏
SLIDE_HEIGHT_INCHES = 7.5

def build_pptx(presentation: dict) -> BytesIO:
    prs = PptxPresentation()
    prs.slide_width = Inches(SLIDE_WIDTH_INCHES)
    prs.slide_height = Inches(SLIDE_HEIGHT_INCHES)

    # 使用空白布局
    blank_layout = prs.slide_layouts[6]  # 通常索引 6 是空白布局

    for slide_data in presentation["slides"]:
        slide = prs.slides.add_slide(blank_layout)

        # 设置背景色
        if bg := slide_data.get("backgroundColor"):
            background = slide.background
            fill = background.fill
            fill.solid()
            fill.fore_color.rgb = RGBColor.from_string(bg.lstrip("#"))

        # 逐元素渲染
        for el in slide_data["elements"]:
            # 百分比 → EMU（精确物理单位）
            left = Emu(int(el["x"] / 100 * Inches(SLIDE_WIDTH_INCHES)))
            top = Emu(int(el["y"] / 100 * Inches(SLIDE_HEIGHT_INCHES)))
            width = Emu(int(el["w"] / 100 * Inches(SLIDE_WIDTH_INCHES)))
            height = Emu(int(el["h"] / 100 * Inches(SLIDE_HEIGHT_INCHES)))

            if el["type"] == "text":
                render_text_element(slide, el, left, top, width, height)
            elif el["type"] == "shape":
                render_shape_element(slide, el, left, top, width, height)
            # icon 类型导出为带背景的文字标签或跳过

    output = BytesIO()
    prs.save(output)
    output.seek(0)
    return output


def render_text_element(slide, el, left, top, width, height):
    """在精确位置创建文本框"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True

    # 垂直对齐
    anchor_map = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE, "bottom": MSO_ANCHOR.BOTTOM}
    tf.paragraphs[0].alignment = {
        "left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT
    }.get(el.get("textAlign", "left"), PP_ALIGN.LEFT)

    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = el["content"]

    # 字号（百分比画布的 px → PPT 的 Pt 近似转换）
    # 基于 960px 画布宽度，PPT 宽度 13.333 英寸 ≈ 960pt（1英寸=72pt）
    run.font.size = Pt(el.get("fontSize", 18))
    run.font.bold = el.get("fontWeight") == "bold"

    if color := el.get("color"):
        run.font.color.rgb = RGBColor.from_string(color.lstrip("#"))

    # 中文字体
    run.font.name = "微软雅黑"


def render_shape_element(slide, el, left, top, width, height):
    """渲染形状元素"""
    from pptx.enum.shapes import MSO_SHAPE

    shape_map = {
        "rectangle": MSO_SHAPE.RECTANGLE,
        "rounded-rect": MSO_SHAPE.ROUNDED_RECTANGLE,
        "circle": MSO_SHAPE.OVAL,
    }

    shape_type = shape_map.get(el.get("shape", "rectangle"), MSO_SHAPE.RECTANGLE)
    shape = slide.shapes.add_shape(shape_type, left, top, width, height)

    if fill_color := el.get("fillColor"):
        shape.fill.solid()
        shape.fill.fore_color.rgb = RGBColor.from_string(fill_color.lstrip("#"))
    else:
        shape.fill.background()  # 透明

    if border_color := el.get("borderColor"):
        shape.line.color.rgb = RGBColor.from_string(border_color.lstrip("#"))
        shape.line.width = Pt(el.get("borderWidth", 1))
    else:
        shape.line.fill.background()  # 无边框
```

---

## 六、主题系统（Theme Presets）

预设几套视觉风格，用户一键切换：

```typescript
// theme_presets.ts

export const THEME_PRESETS: Record<string, Theme> = {
  midnight: {
    name: "午夜深蓝",
    backgroundColor: "#0f172a",
    titleColor: "#f8fafc",
    bodyColor: "#cbd5e1",
    accentColor: "#6366f1",
    fontFamily: "'Noto Sans SC', sans-serif",
    fontFamilyHeading: "'Noto Serif SC', serif",
  },
  minimal_light: {
    name: "极简白",
    backgroundColor: "#ffffff",
    titleColor: "#111827",
    bodyColor: "#4b5563",
    accentColor: "#2563eb",
    fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
  },
  warm_earth: {
    name: "暖土色",
    backgroundColor: "#fef3c7",
    titleColor: "#78350f",
    bodyColor: "#92400e",
    accentColor: "#d97706",
    fontFamily: "'LXGW WenKai', serif",
  },
  forest_green: {
    name: "森林绿",
    backgroundColor: "#052e16",
    titleColor: "#ecfdf5",
    bodyColor: "#a7f3d0",
    accentColor: "#34d399",
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  rose_gold: {
    name: "玫瑰金",
    backgroundColor: "#1c1917",
    titleColor: "#fecdd3",
    bodyColor: "#e7e5e4",
    accentColor: "#fb7185",
    fontFamily: "'Noto Serif SC', serif",
  },
};
```

---

## 七、升级后的 System Prompt（给大模型）

```python
SYSTEM_PROMPT_V2 = """
你是一个顶级演示文稿设计师。用户给你一个主题，你需要为每一页选择最合适的布局模板并填充内容。

## 可用布局模板

1. cover_centered — 封面：大标题居中，适合开场
   fills: title, subtitle
2. cover_left_bold — 封面：标题左对齐 + 装饰色块，适合副标题较长
   fills: title, subtitle
3. section_divider — 章节过渡：大字居中，用于段落切换
   fills: title
4. bullets_icon_list — 要点列表：每条带图标，3~5 条
   fills: title, bullet1, bullet1_icon, bullet2, bullet2_icon, ...(最多 bullet5)
   可用图标: brain, rocket, shield, chart-bar, users, globe, zap, lightbulb, target, trending-up, code, database, smartphone, lock, heart
5. bullets_card_grid — 卡片网格：3~4 个并列概念卡
   fills: title, card1_title, card1_desc, card2_title, card2_desc, ...(最多 card4)
6. stats_three_column — 数据统计：3 个大数字
   fills: title, stat1_number, stat1_label, stat2_number, stat2_label, stat3_number, stat3_label
7. split_two_column — 双栏：左右对比或互补
   fills: title, left_title, left_content, right_title, right_content
8. quote_centered — 引用：金句大字居中
   fills: quote, attribution
9. timeline_horizontal — 时间线：3~4 个时间节点
   fills: title, point1_time, point1_text, point2_time, point2_text, ...(最多 point4)
10. closing_cta — 结尾页：行动号召
    fills: title, subtitle, cta_text

## 输出格式
逐页输出，每页一个 JSON 对象，页与页之间用 ---SLIDE_BREAK--- 分隔。
不要输出 JSON 以外的任何文字。

格式：
{"preset": "模板名", "fills": {"title": "...", ...}}

## 编排规则
- 第一页必须用 cover 类模板
- 每 3~4 页内容页后，可插入 section_divider 过渡
- 最后一页用 closing_cta
- 同一种模板不要连续出现超过 2 次
- bullets 条目 3~5 条，每条不超过 25 字
- stats 数字要有说服力（百分比、倍数、金额等）
- 内容专业、具体、有洞察，拒绝空话套话

## 当前任务
主题：{topic}
页数：{num_slides}
"""
```

---

## 八、迁移步骤（从 v1 到 v2）

### Phase 1：新增预设模板文件
- 创建 `layout_presets/` 目录
- 先写 5 个核心模板 JSON（cover_centered, bullets_icon_list, stats_three_column, split_two_column, closing_cta）
- 实现模板加载器：读取 JSON + 替换 `{{placeholder}}`

### Phase 2：后端生成流程改造
- 更新 System Prompt 为 v2 版本
- 实现两步生成：LLM 输出 preset + fills → 代码注入模板 → 输出完整 elements
- SSE 推送格式不变，只是 slide 内容从 layout+data 变为 elements 数组

### Phase 3：前端渲染器改造
- SlideRenderer 从 switch-case 改为通用 elements 遍历器
- 实现 TextRenderer / ShapeRenderer / IconRenderer 三个原子组件
- 引入拖拽逻辑

### Phase 4：属性面板 + 导出适配
- EditForm 改为动态属性面板
- pptx_service 改为绝对坐标创建方式
- 主题切换功能

每个 Phase 独立可验收，不影响已有功能。
