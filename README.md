# SlideGen - 开源 AI 幻灯片生成系统

SlideGen 是一个基于大语言模型（LLM）的实时幻灯片生成系统。用户只需输入一个主题，系统即可自动规划大纲、设计布局并流式生成完整的 PPT 内容。

> [!TIP]
> **当前版本：v3.0 (PPTist 引擎迁移完成)**  
> 全面迁移至完全开源的专业演示引擎 [PPTist](https://github.com/pipipi-pikachu/PPTist)，获得了媲美专业软件的排版能力、富文本编辑及高质量 PPTX 导出。

---

## ✨ 核心特性

- 🚀 **流式生成**：基于 Server-Sent Events (SSE)，幻灯片内容逐页渲染，无需长时间等待。
- 🎨 **专业排版引擎**：使用 PPTist 提供原生的 PPTX 格式渲染、富文本编辑及自由排版。
- 📝 **海量模板**：由于采用 PPTist 的 AIPPT 5 项协议层（Cover/Contents/Transition/Content/End），可直接复用 PPTist 内置乃至外部引入的各类模板。
- 📥 **多格式导出**：原生支持高质量导出为 `.pptx`、`.pdf` 或图片。
- 🤖 **多模型支持**：原生适配 OpenAI API 兼容接口（如 DeepSeek, Moonshot）及 Google Gemini API。

---

## 🛠️ 技术栈

### 前端 (Frontend)
- **核心框架**: Vue 3 + TypeScript + Vite
- **渲染引擎**: PPTist (Canvas/DOM 混合渲染)
- **状态管理**: Pinia

### 后端 (Backend)
- **核心框架**: Python 3.10+ + FastAPI (Uvicorn, Pydantic)
- **LLM 集成**: OpenAI SDK & Google GenAI SDK (提供 AIPPT 结构化数据)

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

### 2. 人工导入前端引擎 (PPTist)

本项目前端完全基于开源的排版引擎 [PPTist](https://github.com/pipipi-pikachu/PPTist)。在这里，我们需要首先人工导入该项目作为前端工程：

```bash
# 在 SlideGen 根目录下执行
git clone https://github.com/pipipi-pikachu/PPTist.git frontend
```

> **提示**：导入 PPTist 后，可根据相关开发文档将其与后端的 AI 接口接通。

### 3. 启动服务

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

访问 [http://localhost:5173](http://localhost:5173) 即可开始使用。在左侧工具栏点击 `AI` 按钮即可体验一键生成。

---

## 🏗️ 系统架构：AIPPT 分离架构 (v3.0)

相比于 v2.0 耦合度极高的 Layout 渲染架构，v3.0 采用清爽的数据解耦架构：

1.  **后端服务 (`llm_service.py`)**：只负责将大语言模型生成的文本转换成标准的 5 种结构化语义块 (`cover`, `contents`, `transition`, `content`, `end`)，流式发往前端。
2.  **前端引擎 (`PPTist`)**：不再处理坐标推算，而是根据语义将其注入提前设计好的精美 PPT 模板中。

---

## 📅 项目路线图 (Milestones)

- [x] **Phase 1-2**: SSE 通信链路打通，实现 v2.0 早期版本生成 (Deprecated)。
- [x] **Phase 3**: 弃用旧版 Fabric.js 前端，全面拥抱 Vue3 且引入顶级开源项目 PPTist 引擎。
- [x] **Phase 4**: 后端重构，抛弃 `python-pptx` 与陈旧的坐标体系，适配流式 AIPPT 格式。
- [ ] **Phase 5**: 优化模板系统的管理与导入导出、接入网络带图生成。

---

## 📄 许可证
[MIT License](LICENSE) (后端及集成代码) 
前端 PPTist 部分受原生 [AGPL-3.0 License](https://github.com/pipipi-pikachu/PPTist/blob/master/LICENSE) 保护。
