# AI PPT 生成系统 — Claude Code 项目初始化指令

> **使用方式：** 将本文件作为 Claude Code 的 CLAUDE.md 放在项目根目录，或在对话开始时将全文喂给 Claude Code。

---

## 一、项目概述

构建一个 **AI 驱动的演示文稿生成器**，用户输入主题，系统通过大模型实时流式生成幻灯片内容，前端逐页渲染预览，支持二次编辑后导出为 `.pptx` 文件。

**技术栈：**
- 前端：React 18 + Vite + TypeScript
- 后端：Python 3.10+ + FastAPI
- 通信：SSE（Server-Sent Events）单向流式推送
- 核心契约：JSON Schema（前后端与大模型间的唯一数据标准）
- 导出：python-pptx（服务端生成 .pptx 二进制文件）

**项目结构：**
```
project-root/
├── CLAUDE.md              # 本文件
├── frontend/              # React 前端
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types/
│   │   │   └── schema.ts           # JSON Schema 的 TypeScript 类型定义
│   │   ├── hooks/
│   │   │   └── useSSE.ts           # SSE 连接与流式接收 Hook
│   │   ├── components/
│   │   │   ├── InputPanel.tsx       # 主题输入面板
│   │   │   ├── SlideCanvas.tsx      # 16:9 幻灯片画布容器
│   │   │   ├── SlideRenderer.tsx    # 根据 layout 分发渲染
│   │   │   ├── slides/
│   │   │   │   ├── CoverSlide.tsx
│   │   │   │   ├── BulletsSlide.tsx
│   │   │   │   └── SplitSlide.tsx
│   │   │   ├── EditForm.tsx         # 侧边栏表单编辑器
│   │   │   ├── SlideList.tsx        # 缩略图列表/导航
│   │   │   └── ExportButton.tsx     # 导出按钮
│   │   └── styles/
│   │       └── slides.css           # 幻灯片专用样式
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI 入口 + CORS 配置
│   │   ├── routers/
│   │   │   ├── generate.py          # /api/generate_stream 路由
│   │   │   └── export.py            # /api/export 路由
│   │   ├── services/
│   │   │   ├── llm_service.py       # 大模型调用 + Prompt 工程
│   │   │   └── pptx_service.py      # python-pptx 文件组装
│   │   ├── schemas/
│   │   │   └── slide_schema.py      # Pydantic 数据模型
│   │   ├── prompts/
│   │   │   └── system_prompt.py     # 给大模型的 System Prompt（常量）
│   │   └── templates/
│   │       └── base_template.pptx   # PPT 母版模板文件
│   ├── requirements.txt
│   └── .env                         # API Key 等环境变量
└── README.md
```

---

## 二、核心数据契约（JSON Schema）

这是全系统最重要的文件，前端类型定义、后端 Pydantic Model、大模型 System Prompt 都必须严格对齐此结构。

### 2.1 TypeScript 类型定义（前端 `types/schema.ts`）

```typescript
// ===== 核心数据契约 =====
export interface Presentation {
  schemaVersion: "1.0";           // 必须存在，用于未来兼容
  theme: "default" | "dark" | "corporate";
  slides: Slide[];
}

export interface Slide {
  id: string;                      // uuid，前端生成
  layout: "cover" | "bullets" | "split";
  data: CoverData | BulletsData | SplitData;
}

// --- 各 Layout 的数据结构 ---
export interface CoverData {
  title: string;                   // 最多 30 字
  subtitle: string;                // 最多 60 字
}

export interface BulletsData {
  title: string;                   // 最多 30 字
  bullets: string[];               // 3~6 条，每条最多 40 字
}

export interface SplitData {
  title: string;                   // 最多 30 字
  leftContent: string;             // 最多 120 字
  rightContent: string;            // 最多 120 字
}

// ===== SSE 事件负载 =====
export interface SSEEvent {
  status: "generating" | "done" | "error";
  slide?: Omit<Slide, "id">;      // 不含 id，由前端生成
  message?: string;                // 仅 error 时有值
  progress?: {                     // 可选：进度信息
    current: number;
    total: number;
  };
}
```

### 2.2 Pydantic 模型（后端 `schemas/slide_schema.py`）

```python
from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum

class LayoutType(str, Enum):
    COVER = "cover"
    BULLETS = "bullets"
    SPLIT = "split"

class CoverData(BaseModel):
    title: str = Field(..., max_length=30)
    subtitle: str = Field(..., max_length=60)

class BulletsData(BaseModel):
    title: str = Field(..., max_length=30)
    bullets: list[str] = Field(..., min_length=3, max_length=6)

class SplitData(BaseModel):
    title: str = Field(..., max_length=30)
    leftContent: str = Field(..., max_length=120, alias="leftContent")
    rightContent: str = Field(..., max_length=120, alias="rightContent")

class SlidePayload(BaseModel):
    layout: LayoutType
    data: CoverData | BulletsData | SplitData

class PresentationPayload(BaseModel):
    schemaVersion: str = "1.0"
    theme: Literal["default", "dark", "corporate"] = "default"
    slides: list[SlidePayload]
```

---

## 三、后端详细实现规范

### 3.1 FastAPI 入口 (`app/main.py`)

```
- 创建 FastAPI app 实例
- 配置 CORS：allow_origins=["http://localhost:5173"]（Vite 默认端口），
  allow_methods=["*"], allow_headers=["*"]
- 挂载 generate 和 export 两个 router
- 根路由返回健康检查
```

### 3.2 流式生成接口 (`routers/generate.py`)

**路由：** `GET /api/generate_stream`
**查询参数：** `topic: str`, `num_slides: int = 6`（含首页，默认 6 页）

**核心逻辑：**
```python
@router.get("/api/generate_stream")
async def generate_stream(topic: str, num_slides: int = 6):
    async def event_generator():
        try:
            async for slide_json in llm_service.stream_slides(topic, num_slides):
                # 每一块做 Pydantic 校验，失败则跳过该页并 log
                try:
                    validated = SlidePayload.model_validate_json(slide_json)
                    yield f"data: {json.dumps({'status': 'generating', 'slide': validated.model_dump()})}\n\n"
                except ValidationError as e:
                    logger.warning(f"LLM 输出格式异常，跳过: {e}")
                    continue
            yield f"data: {json.dumps({'status': 'done'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**关键防御策略：**
- 每一页 JSON 块都必须经过 Pydantic 校验，**不合格直接丢弃而非中断流**
- 外层 try-except 兜底所有异常，通过 SSE 将错误信息推送到前端
- 设置合理的超时（单次生成不超过 120 秒）

### 3.3 LLM 调用服务 (`services/llm_service.py`)

**关键：System Prompt 工程**

给大模型的 System Prompt 必须写在 `prompts/system_prompt.py` 中，作为常量维护：

```python
SYSTEM_PROMPT = """
你是一个专业的演示文稿内容架构师。用户会给你一个主题，你需要生成一组幻灯片内容。

## 输出格式规则（必须严格遵守，违反则视为失败）：

1. 你必须逐页输出，每页是一个独立的 JSON 对象，页与页之间用 `---SLIDE_BREAK---` 分隔。
2. 不要输出任何 JSON 以外的文字、解释、Markdown 标记或代码围栏。
3. 每个 JSON 对象的结构如下：

对于封面页（第一页必须是封面）：
{"layout": "cover", "data": {"title": "不超过30字的标题", "subtitle": "不超过60字的副标题"}}

对于要点页：
{"layout": "bullets", "data": {"title": "不超过30字的标题", "bullets": ["要点1(≤40字)", "要点2", "要点3"]}}

对于分栏页：
{"layout": "split", "data": {"title": "不超过30字的标题", "leftContent": "左栏内容(≤120字)", "rightContent": "右栏内容(≤120字)"}}

## 内容编排规则：
- 第 1 页必须是 cover 布局
- 中间页混合使用 bullets 和 split，bullets 出现次数不少于总页数的一半
- 最后一页建议使用 cover 布局作为结尾页（如"谢谢"或行动号召）
- bullets 条目数必须 3~6 条，绝对不能超过 6 条
- 内容必须专业、准确、信息密度高，不要空洞套话

## 当前任务：
用户主题：{topic}
生成页数：{num_slides}
"""
```

**流式解析逻辑：**

```
- 调用大模型 API 时使用 stream=True
- 维护一个 buffer 字符串，持续拼接 token
- 每当检测到 `---SLIDE_BREAK---` 分隔符时：
    - 提取分隔符前的内容
    - 尝试 json.loads() 解析
    - 解析成功则 yield 该 JSON 字符串
    - 解析失败则 log 并跳过
    - 清空 buffer 继续拼接
- 流结束后检查 buffer 是否还有剩余内容（最后一页可能没有分隔符）
```

**兼容 OpenAI 兼容 API 的调用方式（支持 DeepSeek、Moonshot 等）：**

```python
import openai

client = openai.AsyncOpenAI(
    api_key=os.getenv("LLM_API_KEY"),
    base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
)

async def stream_slides(topic: str, num_slides: int):
    response = await client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.format(topic=topic, num_slides=num_slides)},
            {"role": "user", "content": f"请为主题「{topic}」生成 {num_slides} 页幻灯片。"}
        ],
        stream=True,
        temperature=0.7,
    )
    
    buffer = ""
    async for chunk in response:
        delta = chunk.choices[0].delta.content or ""
        buffer += delta
        
        while "---SLIDE_BREAK---" in buffer:
            slide_str, buffer = buffer.split("---SLIDE_BREAK---", 1)
            slide_str = slide_str.strip()
            if slide_str:
                yield slide_str
    
    # 处理最后一页（没有尾部分隔符）
    buffer = buffer.strip()
    if buffer:
        yield buffer
```

### 3.4 PPT 导出服务 (`services/pptx_service.py`)

```
- 输入：PresentationPayload（经 Pydantic 校验后的完整 JSON）
- 流程：
    1. 加载 templates/base_template.pptx 作为母版
    2. 遍历 slides 数组
    3. 根据 layout 字段选择对应的 SlideLayout：
        - cover  → prs.slide_layouts[0]（标题幻灯片）
        - bullets → prs.slide_layouts[1]（标题和内容）
        - split   → prs.slide_layouts[5]（两栏内容）或自定义布局
    4. 将 data 字段的文本填入对应 placeholder
    5. 写入 BytesIO 并返回
- 输出：BytesIO 对象（由路由层包装为 StreamingResponse）
```

### 3.5 导出路由 (`routers/export.py`)

```python
@router.post("/api/export")
async def export_pptx(payload: PresentationPayload):
    file_bytes = pptx_service.build_pptx(payload)
    return StreamingResponse(
        file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": "attachment; filename=presentation.pptx"}
    )
```

### 3.6 环境变量 (`.env`)

```env
LLM_API_KEY=sk-xxxxx
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

### 3.7 依赖 (`requirements.txt`)

```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
python-pptx>=0.6.23
openai>=1.30.0
python-dotenv>=1.0.0
pydantic>=2.7.0
```

---

## 四、前端详细实现规范

### 4.1 核心 Hook：`useSSE.ts`

**重要：不要使用 EventSource，使用 fetch + ReadableStream。** 原因：EventSource 仅支持 GET 且无法自定义 header，未来扩展性差。

```typescript
// useSSE.ts 核心逻辑伪代码
function useSSE() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);

  const startGeneration = async (topic: string) => {
    // 重置状态
    setSlides([]);
    setStatus("loading");
    abortRef.current = new AbortController();

    try {
      const response = await fetch(
        `/api/generate_stream?topic=${encodeURIComponent(topic)}`,
        { signal: abortRef.current.signal }
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // 按 "data: " 前缀拆分 SSE 事件
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload: SSEEvent = JSON.parse(line.slice(6));

          if (payload.status === "generating" && payload.slide) {
            const newSlide: Slide = {
              id: crypto.randomUUID(),
              ...payload.slide,
            };
            setSlides(prev => [...prev, newSlide]);
          } else if (payload.status === "done") {
            setStatus("done");
          } else if (payload.status === "error") {
            setStatus("error");
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("error");
    }
  };

  const stopGeneration = () => abortRef.current?.abort();

  return { slides, setSlides, status, startGeneration, stopGeneration };
}
```

### 4.2 画布渲染组件

**SlideCanvas.tsx — 16:9 强制比例容器：**

```
- 外层 div 设定 aspect-ratio: 16/9, width: 100%, max-width: 960px
- 内层使用 overflow: hidden 绝对兜底
- 所有文字使用 CSS clamp() 做响应式字号
- 背景色/渐变根据 theme 字段切换
```

**SlideRenderer.tsx — Layout 分发器：**

```tsx
function SlideRenderer({ slide }: { slide: Slide }) {
  switch (slide.layout) {
    case "cover":  return <CoverSlide data={slide.data as CoverData} />;
    case "bullets": return <BulletsSlide data={slide.data as BulletsData} />;
    case "split":  return <SplitSlide data={slide.data as SplitData} />;
    default:       return <FallbackSlide />;  // 防御性：未知 layout 不崩溃
  }
}
```

**各 Slide 组件的 CSS 防溢出策略（必须执行）：**

```css
/* 所有幻灯片标题 */
.slide-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

/* Bullets 列表 */
.slide-bullets li {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Split 栏内容 */
.slide-split-content {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
}
```

### 4.3 表单编辑器 (`EditForm.tsx`)

```
- 输入：当前选中的 slide 对象 + 更新回调 onUpdate(slideId, newData)
- 根据 slide.layout 动态渲染不同表单：
    - cover  → title input + subtitle textarea
    - bullets → title input + 动态 bullet 列表（支持增删）
    - split  → title input + leftContent textarea + rightContent textarea
- 每个 input 的 onChange 直接调用 onUpdate，触发画布实时刷新
- 显示实时字数统计和上限提示（如 "12/30 字"）
```

### 4.4 导出按钮 (`ExportButton.tsx`)

```typescript
async function handleExport(presentation: Presentation) {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(presentation),
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "presentation.pptx";
  a.click();
  URL.revokeObjectURL(url);
}
```

### 4.5 页面整体布局 (`App.tsx`)

```
采用三栏布局：
┌──────────────────────────────────────────────┐
│  顶部导航栏：Logo + 主题输入框 + 生成按钮     │
├────────┬────────────────────┬─────────────────┤
│        │                    │                 │
│ 缩略图  │   16:9 主画布      │  编辑表单        │
│ 列表    │   (当前选中页)      │  (绑定选中页)    │
│        │                    │                 │
├────────┴────────────────────┴─────────────────┤
│  底部工具栏：导出按钮 + 页数统计               │
└──────────────────────────────────────────────┘

- 左侧缩略图：点击切换当前选中页，选中态加蓝色边框
- 中间画布：实时渲染当前页
- 右侧表单：编辑当前页内容
- 生成过程中：自动选中最新生成的页，画布实时更新
```

---

## 五、开发阶段与里程碑

### 阶段一：跑通 SSE 通信链路（Mock 数据，不接大模型）

**目标：** 前后端 SSE 通信正常，前端能逐页渲染。

**后端任务：**
1. 搭建 FastAPI 基础框架 + CORS
2. `/api/generate_stream` 使用 `asyncio.sleep(1)` 模拟，每秒推送一页 mock JSON
3. 推送 5 页后发送 done 事件

**前端任务：**
1. Vite + React + TypeScript 项目初始化
2. 实现 useSSE Hook，连接后端
3. 实现 SlideCanvas + 三种 Slide 组件的基础渲染
4. 验证逐页出现的动画效果

**验收标准：** 浏览器打开后，输入任意文字点击生成，每秒弹出一页幻灯片预览。

### 阶段二：接入大模型，实现真实生成

**目标：** 替换 mock，使用真实 LLM 生成内容。

**后端任务：**
1. 实现 `llm_service.py`，接入 OpenAI 兼容 API
2. 编写 System Prompt，强制输出 JSON 格式
3. 实现流式解析（按 `---SLIDE_BREAK---` 分割）
4. 添加 Pydantic 校验，格式异常自动跳过

**验收标准：** 输入真实主题，前端能流式显示 AI 生成的幻灯片内容。

### 阶段三：二次编辑 + 导出

**目标：** 用户能修改内容并导出 .pptx 文件。

**后端任务：**
1. 准备 `base_template.pptx` 母版文件
2. 实现 `pptx_service.py`，JSON → PPTX 映射
3. 实现 `/api/export` 路由

**前端任务：**
1. 实现 EditForm 组件，与画布双向绑定
2. 实现 SlideList 缩略图导航
3. 实现 ExportButton 下载逻辑

**验收标准：** 编辑内容后导出的 .pptx 在 PowerPoint 中打开正常。

### 阶段四：样式打磨 + 错误处理

**目标：** 产品级 UI 质感 + 健壮的异常处理。

1. 添加生成中的骨架屏/加载动画
2. SSE 断连时显示友好提示 + 重试按钮
3. 表单增加字数实时校验
4. 响应式适配（移动端最小可浏览，PC 端完整体验）
5. 全局错误边界 (ErrorBoundary)

---

## 六、编码规范与约束

### 通用规范
- 所有代码必须有清晰的中文注释
- 变量命名使用英文，注释使用中文
- 每个文件控制在 200 行以内，超出则拆分
- 禁止 any 类型（TypeScript），禁止忽略异常（Python）

### 前端规范
- 使用函数组件 + Hooks，禁止 class 组件
- CSS 使用 CSS Modules 或内联 style object，不使用全局 CSS（slides.css 除外）
- 所有外部请求封装在 hooks 或 services 目录
- 状态管理：本项目规模用 useState + useContext 即可，不引入 Redux/Zustand

### 后端规范
- 所有接口入参必须经过 Pydantic 校验
- 异步函数统一使用 async/await
- 日志使用 Python logging 模块，生产级别 INFO
- 环境变量统一用 python-dotenv 加载，禁止硬编码 API Key
- CORS 开发环境允许 localhost，生产环境需配置具体域名

---

## 七、可能遇到的问题与解决方案

| 问题 | 解决方案 |
|------|----------|
| LLM 输出的 JSON 格式不合法 | 每页 Pydantic 校验 + try-catch，失败跳过不中断流 |
| LLM 输出文字超长 | System Prompt 约束 + 前端 CSS line-clamp 双重兜底 |
| SSE 连接中途断开 | 前端检测断连 → 显示提示 + 重试按钮（不自动重连） |
| python-pptx 中文乱码 | 模板中预设好中文字体（微软雅黑），代码中显式指定 font_name |
| 并发用户过多 | 后端加 asyncio.Semaphore 限制同时生成数（如最多 5 个） |
| topic 参数过长 | 前端限制输入 200 字 + 后端 Query 参数校验 |

---

## 八、测试用例（手动验收清单）

- [ ] 输入空主题，系统提示"请输入主题"
- [ ] 输入正常主题，幻灯片逐页出现（非一次性全部出现）
- [ ] 生成过程中点击"停止"，流中断，已生成的页面保留
- [ ] 点击缩略图切换页面，画布和表单同步更新
- [ ] 在表单修改标题，画布实时更新
- [ ] 增加/删除 bullets 条目，画布实时更新
- [ ] 点击导出，浏览器下载 .pptx 文件
- [ ] 打开导出的 .pptx，内容与编辑后的一致
- [ ] 故意断网后重试，系统不崩溃
- [ ] 大模型返回异常格式（可用 mock 模拟），不影响已生成页面
