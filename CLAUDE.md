# AI PPT 生成系统 — Claude Code 项目初始化指令 (v2.0)

> **使用方式：** 将本文件作为 Claude Code 的 CLAUDE.md 放在项目根目录，或在对话开始时将全文提供给 AI 指令。本文件定义了系统的核心架构、数据契约及开发规范。

---

## 一、项目概述

SlideGen 是一个 **AI 驱动的演示文稿生成器**。用户输入主题，系统通过 LLM 实时流式生成内容，并采用“两步生成法”实现高精度的幻灯片渲染及导出。

**技术栈：**
- **前端**：React 18 + Vite + TypeScript + Tailwind CSS
- **后端**：Python 3.10+ + FastAPI
- **通信**：SSE（Server-Sent Events）
- **核心协议**：JSON Schema v2.0（基于预设模板 + 变量填充）
- **导出**：python-pptx（绝对坐标物理渲染）

**项目结构：**
```
project-root/
├── README.md              # 项目快照与快速开始
├── CLAUDE.md              # 本文件（AI 开发指令）
├── frontend/              # 移动优先的 React 前端
│   ├── src/
│   │   ├── types/
│   │   │   └── schema.ts           # v2.0 核心类型定义
│   │   ├── components/
│   │   │   ├── SlideCanvas.tsx      # 16:9 画布容器
│   │   │   ├── SlideRenderer.tsx    # 模板分发器
│   │   │   ├── elements/            # Text, Shape, Icon 原子组件
│   │   │   └── slides/              # 各布局预设的 UI 实现
│   │   └── hooks/
│   │       └── useSSE.ts           # 接收流式数据
├── backend/
│   ├── app/
│   │   ├── routers/                # generate/export 路由
│   │   ├── services/
│   │   │   ├── llm_service.py       # 双引擎 LLM 调用 (OpenAI/Gemini)
│   │   │   └── pptx_service.py      # 绝对坐标导出逻辑
│   │   ├── prompts/
│   │   │   └── system_prompt.py     # v2.0 模板变量 Prompt
│   │   └── layout_presets/         # 布局预设定义 (JSON)
└── start.sh                # 一键启动脚本
```

---

## 二、核心数据契约 (v2.0 Schema)

系统不再使用硬编码的布局字段，而是通过 `layout` 指向预设名称，通过 `data` 提供填充内容。

### 2.1 TypeScript 定义 (`frontend/src/types/schema.ts`)
```typescript
export interface Presentation {
  schemaVersion: "2.0";
  theme: "default" | "dark" | "corporate";
  slides: Slide[];
}

export interface Slide {
  id: string;
  layout: "cover_centered" | "bullets_icon_list" | "stats_three_column" | ...;
  data: Record<string, string>; // 平铺键值对，对应模板中的 {{variable}}
}
```

### 2.2 后端模型 (`backend/app/schemas/slide_schema.py`)
```python
class SlidePayload(BaseModel):
    layout: str
    data: dict[str, str]

class PresentationPayload(BaseModel):
    schemaVersion: str = "2.0"
    slides: list[SlidePayload]
```

---

## 三、LLM 交互规范

### 3.1 提示词策略 (System Prompt)
大模型 **不负责计算坐标**，只负责：
1. **语义理解**：根据主题选择最合适的布局预设。
2. **内容生成**：为选定的布局生成结构化填充数据（Fills）。
3. **格式约束**：强制输出以 `---SLIDE_BREAK---` 分隔的纯 JSON 块。

### 3.2 布局白名单
开发新功能时，必须同时更新 `system_prompt.py` 和前端 `SlideRenderer.tsx` 以支持新的布局 ID（如 `timeline_horizontal`, `quote_centered` 等）。

---

## 四、核心实现逻辑

### 4.1 SSE 流式处理
- 前端使用 `fetch` + `ReadableStream` 接收数据。
- 后端 `llm_service.py` 负责在 LLM 输出流中解析分隔符，逐个推送完整的 Slide JSON。

### 4.2 PPTX 绝对坐标导出
- 导出引擎将 960x540 的虚拟坐标系等比映射到 PPT 的物理尺寸。
- 使用 `python-pptx` 的 `add_textbox` 和 `add_shape` 在空白母版上直接绘图，不依赖幻灯片占位符。

---

## 五、编码规范与约束

- **通用**：注释使用中文，变量名使用英文。
- **前端**：使用函数式组件与 Hooks；UI 必须适配 16:9 比例锁定；所有图标使用 Lucide React。
- **后端**：严格执行 Pydantic 校验；LLM 异常必须捕获并以 SSE 错误事件告知前端。
- **文件限制**：单个文件尽量控制在 200 行以内，逻辑复杂的 Service 需拆分子模块。

---

## 六、开发路线 ( Roadmap 2.0 )
1. [x] **基础设施**：SSE + 两步生成架构。
2. [x] **模板扩展**：实现 10+ 核心布局适配。
3. [x] **交互增强**：Fabric.js 实现画布元素选中与基本拖拽。
4. [ ] **高级视觉**：接入 Unsplash API 实现 AI 图片搜索与配图。
5. [ ] **主题系统**：支持颜色主题包的动态映射。
