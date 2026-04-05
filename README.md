# SlideGen — AI 幻灯片生成系统

> **本项目前端完全基于 [PPTist](https://github.com/pipipi-pikachu/PPTist) 构建。**  
> PPTist 是由 [@pipipi-pikachu](https://github.com/pipipi-pikachu) 开发的开源在线演示文稿应用，提供了专业级的 PPT 渲染引擎、富文本编辑、模板系统及高质量 PPTX 导出能力。SlideGen 在此基础上集成了自托管的 AI 生成后端，实现了完整的"大纲生成 → 模板选择 → 流式内容填充"工作流。

---

## ✨ 核心特性

- 🧠 **两阶段 AI 生成**：先由 LLM 生成可编辑大纲，用户确认后再按大纲流式生成完整 PPT
- 🚀 **流式渲染**：基于 SSE，幻灯片逐页实时渲染，无需等待全部完成
- 📊 **表格支持**：LLM 可生成 `table` 类型幻灯片，数据自动映射为 PPTist 原生表格元素
- 🖼️ **图文混排**：内容页支持 `imageUrl` 字段，自动注入配图
- 🔍 **图片库**：内置 Pexels 图片搜索（需配置 API Key）
- ✍️ **AI 文本优化**：选中文字可一键美化改写、扩写丰富、精简提炼（自托管 LLM）
- 🤖 **多模型支持**：兼容 OpenAI 接口（DeepSeek、Moonshot 等）及 Google Gemini API
- 📥 **多格式导出**：原生支持导出为 `.pptx`、`.pdf` 或图片（由 PPTist 引擎提供）

---

## 🙏 致谢

本项目的前端渲染能力完全来自 **[PPTist](https://github.com/pipipi-pikachu/PPTist)**，这是一个功能完整、质量卓越的开源在线演示文稿应用。

| | |
|---|---|
| **项目** | [PPTist](https://github.com/pipipi-pikachu/PPTist) |
| **作者** | [@pipipi-pikachu](https://github.com/pipipi-pikachu) |
| **许可证** | [AGPL-3.0](https://github.com/pipipi-pikachu/PPTist/blob/master/LICENSE) |

SlideGen 的所有 PPT 排版渲染、模板系统、AIPPT 内容映射钩子（`useAIPPT.ts`）、富文本编辑及 PPTX 导出均由 PPTist 引擎提供。SlideGen 仅在此基础上实现了自托管 AI 后端与前后端对接层。

---

## 🛠️ 技术栈

### 前端（Frontend）
- **渲染引擎**：[PPTist](https://github.com/pipipi-pikachu/PPTist)（Vue 3 + TypeScript + Vite + Canvas 混合渲染）
- **状态管理**：Pinia

### 后端（Backend）
- **框架**：Python 3.10+ + FastAPI
- **LLM 集成**：OpenAI SDK / Google GenAI SDK
- **图片搜索**：Pexels API

---

## 🚀 快速开始

### 1. 配置后端环境变量

编辑 `backend/.env`：

```env
# LLM 提供商（openai 或 gemini）
LLM_PROVIDER=gemini

# OpenAI 兼容接口（DeepSeek / Moonshot 等）
# LLM_API_KEY=sk-xxxxx
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_MODEL=gpt-4o-mini

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# Pexels 图片搜索（可选，免费申请：https://www.pexels.com/api/）
PEXELS_API_KEY=your_pexels_api_key
```

### 2. 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173)，点击左侧工具栏的 **AI** 按钮即可开始使用。

---

### 查看后端日志

后端服务的日志（包括图片生成过程的详细信息）会直接输出到您启动服务时所在的终端窗口。

- **如果使用 `start.sh` 脚本启动**：
  日志会直接显示在运行 `start.sh` 的终端里。

- **如果单独启动后端**：
  日志会显示在运行 `uvicorn app.main:app --reload` 的终端里。

您可以观察日志中的 `[INFO] app.services.image_service:` 开头的行，来跟踪图片服务的具体行为。

---

## 🏗️ 系统架构

```
用户输入主题
    ↓
POST /api/generate_outline  →  LLM 生成 Markdown 大纲
    ↓
用户在 OutlineEditor 中确认/编辑大纲
    ↓
选择模板
    ↓
GET /api/generate_stream?outline=...  →  LLM 按大纲流式生成 AIPPT JSON
    ↓
useAIPPT.ts（PPTist）将每页 JSON 注入模板，实时渲染
    ↓
用户可导出 .pptx / .pdf
```

**AIPPT 数据格式（6 种语义类型）：**

| 类型 | 说明 |
|---|---|
| `cover` | 封面页（标题 + 副标题） |
| `contents` | 目录页 |
| `transition` | 章节过渡页 |
| `content` | 内容页（要点列表，支持 `imageUrl`） |
| `table` | 数据表格页 |
| `end` | 结束页 |

---

## 📅 路线图

- [x] SSE 流式生成与 PPTist AIPPT 对接
- [x] 两阶段生成：大纲确认 → 内容生成
- [x] 表格类型幻灯片支持
- [x] 内容页图片注入（`imageUrl`）
- [x] 图片库（Pexels API 自托管）
- [x] AI 文本优化（美化 / 扩写 / 精简，自托管 LLM）
- [ ] 更多模板支持与管理
- [ ] 部署配置文档

---

## 📄 许可证

本项目遵循 **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**。

前端完全基于 [PPTist](https://github.com/pipipi-pikachu/PPTist)，该项目同样使用 AGPL-3.0 许可证。  
详见 [frontend/LICENSE](frontend/LICENSE)。
