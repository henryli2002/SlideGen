# SlideGen - AI 驱动的幻灯片生成系统

SlideGen 是一个基于大语言模型（LLM）的实时幻灯片生成系统。用户只需输入一个主题，系统即可自动规划大纲、设计布局并流式生成完整的 PPT 内容，支持在线预览、二次编辑及导出为 `.pptx` 文件。

> [!TIP]
> **当前版本：v2.0 (Progress Snapshot)**  
> 采用“预设模板 + 变量填充”的混合架构，兼顾了生成的灵活性与排版的严谨性。

---

## ✨ 核心特性

- 🚀 **流式生成**：基于 Server-Sent Events (SSE)，幻灯片内容逐页渲染，无需长时间等待。
- 🎨 **多样化布局**：内置 10+ 种专业布局（封面、要点、数据统计、时间线、双栏对比等）。
- 📝 **实时编辑**：支持对生成的每一页内容进行即时修改，画布实时刷新。
- 📥 **专业导出**：通过 `python-pptx` 引擎，将在线内容精准转化为 PowerPoint 二进制文件。
- 🤖 **多模型支持**：原生适配 OpenAI API 兼容接口（如 DeepSeek, Moonshot）及 Google Gemini API。

---

## 🛠️ 技术栈

### 前端 (Frontend)
- **核心框架**: React 18 + Vite + TypeScript
- **状态管理**: React Hooks (useState, useEffect, useMemo)
- **图标库**: Lucide React
- **辅助库**: Fabric.js (用于画布交互)

### 后端 (Backend)
- **核心框架**: Python 3.10+ + FastAPI
- **LLM 集成**: OpenAI SDK & Google GenAI SDK
- **PPT 转换**: python-pptx
- **部署维护**: Uvicorn + Pydantic (数据校验)

---

## 🚀 快速开始

### 1. 配置环境
在项目根目录下创建 `.env` 文件，根据需求配置 API Key：

```env
# 使用 OpenAI/DeepSeek 路径
LLM_PROVIDER=openai
LLM_API_KEY=sk-xxxxx
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# 或使用 Gemini 路径
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=xxxx
# GEMINI_MODEL=gemini-2.0-flash
```

### 2. 启动服务

**推荐方式：**
在根目录运行 `bash start.sh`，可一键启动前后端服务。

**手动启动：**

- **后端**:
  ```bash
  cd backend
  python -m venv venv
  source venv/bin/activate  # Windows 使用 venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn app.main:app --reload
  ```

- **前端**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

访问 [http://localhost:5173](http://localhost:5173) 即可开始使用。

---

## 🏗️ 系统架构：两步生成法 (v2.0)

相比于 v1.0 的语义化标签，v2.0 采用了更强大的两步生成流程：

1.  **内容规划 (LLM)**：大模型根据主题选择合适的 `layout_preset`（如 `stats_three_column`），并生成对应的文本/数据填充项（`fills`）。
2.  **布局映射 (Internal Logic)**：后端（及前端渲染器）将填充项映射到预定义的视觉元素上，实现像素级位置控制与多端一致的导出效果。

---

## 📅 项目路线图 (Milestones)

- [x] **Phase 1**: SSE 通信链路打通，实现逐页预览。
- [x] **Phase 2**: 接入 LLM，支持 3 种基础布局。
- [x] **Phase 3**: 升级至 v2.0，支持 10+ 种增强布局与模板系统。
- [x] **Phase 4**: 实现 PPTX 导出与画布实时编辑功能。
- [ ] **Phase 5**: 增加图片搜索集成 (Unsplash API) 与配色方案自定义。
- [ ] **Phase 6**: AI 自动配图与背景生成。

---

## 📄 许可证
[MIT License](LICENSE)
