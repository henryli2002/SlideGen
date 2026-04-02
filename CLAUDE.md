# SlideGen — AI PPT 生成系统 开发指令 (v3.0)

> **使用方式：** 将本文件作为 Claude/Gemini Code 的内置指令放在项目根目录。本文件定义了系统 v3.0 的核心架构、数据契约及开发规范。

---

## 一、项目概述

SlideGen 已经全面迁移至 **PPTist 开源演示引擎**。该架构将"内容生成"与"排版渲染"彻底解耦：
后端 LLM 负责生成标准的知识结构内容（AIPPT 格式）；渲染、模板匹配、富文本编辑及 PPTX 原生导出，全权交由前端的 PPTist 引擎处理。

**技术栈：**
- **前端**：Vue 3 + Vite + TypeScript + Pinia
- **PPT引擎**：[PPTist](https://github.com/pipipi-pikachu/PPTist) (Canvas 混合渲染)
- **后端**：Python 3.10+ + FastAPI + Pydantic
- **连接层**：SSE (Server-Sent Events) 单向流式传输
- **LLM 双引擎**：OpenAI 兼容接口 (DeepSeek/Moonshot) + Gemini API

**项目结构：**
```
project-root/
├── README.md              # 项目快照与架构说明
├── CLAUDE.md              # 本文件（开发指令）
├── frontend/              # PPTist 前端引擎代码
│   ├── src/
│   │   ├── types/
│   │   │   └── AIPPT.ts            # AIPPT 的数据接口定义
│   │   ├── hooks/
│   │   │   └── useAIPPT.ts         # 将后端 SSE 响应映射至模板的钩子
│   │   ├── services/
│   │   │   └── index.ts            # 后端 API 连接点 (生成流式请求在此处发起)
│   │   └── views/Editor/
│   │       └── AIPPTDialog.vue     # AI 生成面板界面
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── routers/
│   │   │   └── generate.py         # /api/generate_stream SSE 流式接口
│   │   ├── services/
│   │   │   └── llm_service.py      # 大模型提示词构建与执行
│   │   └── schemas/
│   │       └── slide_schema.py     # AIPPT Pydantic 校验模型
└── start.sh               # 环境启动脚本
```

---

## 二、核心数据契约 (AIPPT Schema v3.0)

与老版本传输绝对坐标或复杂的 `layout_preset` 键值对不同，v3.0 采用极简的语义流格式。
后端生成的每一块数据必须严格遵循这 **5** 种语义 `type` 的其中一种：

### 1. Cover (封面 - 第1页)
```json
{
  "type": "cover",
  "data": { "title": "标题", "text": "副标题简介" }
}
```

### 2. Contents (目录 - 第2页)
```json
{
  "type": "contents",
  "data": { "items": ["章节1", "章节2", "章节3"] }
}
```

### 3. Transition (章节过渡 - 夹在各章节中)
```json
{
  "type": "transition",
  "data": { "title": "章节标题", "text": "本章节内容概括" }
}
```

### 4. Content (内容页 - 属于具体章节中)
```json
{
  "type": "content",
  "data": {
    "title": "当前页面顶上的的大标题",
    "items": [
      { "title": "要点1", "text": "要点详情" },
      { "title": "要点2", "text": "要点详情" }
    ]
  }
}
```
*注：原则上每页 `Content` 页面建议包含 2-4 个 `items`，避免过于拥挤。*

### 5. End (结束页 - 最后1页)
```json
{
  "type": "end"
}
```

---

## 三、通信协议

后端 `generate.py` 会将 `slide_schema.py` 验证通过的具体项作为 `slide` 属性，以 JSON 行格式通过 Data 推给前端。

**SSE 通信格式样例：**
```
data: {"status": "generating", "slide": {"type": "cover", "data": {...}}, "index": 0, "templateId": "default"}
...
data: {"status": "done", "total": 12, "templateId": "default"}
```
前端在 `AIPPTDialog.vue` 中解析 `payload.slide` 并传递给 `useAIPPT.ts`。

---

## 四、开发与修改规范

1. **不可破坏引擎结构**：`frontend` 基本上是在 [PPTist](https://github.com/pipipi-pikachu/PPTist) 开源引擎上的客制化。如果有核心功能需要补充，尽量通过 `hooks` 或者独立的 API 层封装，谨慎大幅重构其渲染器代码，否则会导致上游合并困难或原生内置模板断层。
2. **后端的纯净化**：后端绝对不允许引入 `python-pptx` 等依赖或处理任何前端布局。后端的最终诉求有且只有：输出稳定、高质量的含有上述 5 种类型的 JSON。
3. **不要使用 Fabric.js**：如果旧记录中提到 Fabric.js 或者 React，代表那是已废纸篓的过时文档。
4. **验证必测**：所有新增 LLM 功能（比如扩写/精写）要验证其解析在 Vue 层是否抛错。

---

## 五、v3.0 里程碑 (Roadmap)

- [x] **后端重构**：移除 Python-pptx，重写 Pydantic 与生成路由。
- [x] **引入 PPTist**：替换陈旧的 React 画布，Vue 3 接管前端底座。
- [x] **前后端桥接**：调整 `AIPPTDialog` 对接本地 `/api/generate_stream`。
- [ ] **多模板支持**：允许后端或用户手动定义更丰富的 templateId 进行风格预渲染。
- [ ] **图片注入 (RAG/API search)**：在 `Content` 页面的 JSON 扩充网络可请求 `imageUrl` 并在前端展现。
