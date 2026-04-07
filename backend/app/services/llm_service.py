"""
LLM 服务层 — 流式生成 PPTist AIPPT 格式的幻灯片数据

支持双引擎：OpenAI 兼容接口（含 DeepSeek/Moonshot）及 Google Gemini API。
未配置真实 API Key 时自动降级为 mock 模式。
"""

import os
import json
import logging
import asyncio
from typing import AsyncGenerator

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ===== Mock 数据：覆盖 PPTist AIPPT 的全部 5 种类型 =====
MOCK_SLIDES = [
    {
        "type": "cover",
        "data": {
            "title": "人工智能的未来",
            "text": "探索 AI 技术如何深刻改变我们的世界与生活方式",
        },
    },
    {
        "type": "contents",
        "data": {
            "items": [
                "AI 核心技术概览",
                "产业规模与趋势",
                "机遇与挑战",
                "应用领域展望",
                "未来发展方向",
            ]
        },
    },
    {
        "type": "transition",
        "data": {
            "title": "AI 核心技术概览",
            "text": "本章将介绍深度学习、NLP、计算机视觉等关键技术。",
        },
    },
    {
        "type": "content",
        "data": {
            "title": "四大核心技术",
            "items": [
                {
                    "title": "深度学习",
                    "text": "模拟人脑神经网络的多层算法结构，是当代 AI 的核心驱动力。",
                },
                {
                    "title": "自然语言处理",
                    "text": "让机器理解和生成人类语言，ChatGPT 是其代表性应用。",
                },
                {
                    "title": "计算机视觉",
                    "text": "赋予机器识别图像与视频的能力，广泛用于自动驾驶和医学影像。",
                },
                {
                    "title": "强化学习",
                    "text": "通过奖惩机制训练自主决策智能体，AlphaGo 是经典案例。",
                },
            ],
        },
    },
    {
        "type": "table",
        "data": {
            "title": "主流 AI 大模型对比",
            "headers": ["模型", "发布机构", "参数规模", "擅长领域"],
            "rows": [
                ["GPT-4o", "OpenAI", "未公开", "多模态、推理、编码"],
                ["Claude 3.5", "Anthropic", "未公开", "长文本、安全对话"],
                ["Gemini 2.0", "Google", "未公开", "多模态、代码、搜索"],
                ["DeepSeek R1", "深度求索", "671B", "推理、数学、科学"],
                ["Llama 3.1", "Meta", "405B", "开源、本地部署"],
            ],
        },
    },
    {
        "type": "transition",
        "data": {
            "title": "产业规模与趋势",
            "text": "全球 AI 产业正以惊人速度增长，深刻影响各行各业。",
        },
    },
    {
        "type": "content",
        "data": {
            "title": "AI 产业规模一览",
            "items": [
                {
                    "title": "市场规模",
                    "text": "2030 年全球 AI 市场规模预计达 1.8 万亿美元，年复合增长率超 35%。",
                },
                {
                    "title": "就业影响",
                    "text": "AI 相关领域预计创造 9700 万个新增就业岗位，同时重塑现有职业结构。",
                },
                {
                    "title": "生产力提升",
                    "text": "已采用 AI 的企业平均生产力提升 40%，运营成本降低 25%。",
                },
            ],
        },
    },
    {
        "type": "transition",
        "data": {
            "title": "机遇与挑战",
            "text": "AI 发展带来巨大机遇的同时，也面临伦理与安全挑战。",
        },
    },
    {
        "type": "content",
        "data": {
            "title": "核心机遇",
            "items": [
                {
                    "title": "医疗革命",
                    "text": "AI 辅助影像诊断准确率超过 95%，药物研发周期缩短 60%。",
                },
                {
                    "title": "教育个性化",
                    "text": "自适应学习系统根据每个学生的进度和能力定制教学方案。",
                },
                {
                    "title": "科学加速",
                    "text": "AI 帮助科学家从海量数据中发现新规律，加速科研突破。",
                },
            ],
        },
    },
    {
        "type": "content",
        "data": {
            "title": "主要挑战",
            "items": [
                {
                    "title": "数据隐私",
                    "text": "AI 系统对大规模数据的依赖引发个人隐私保护和数据安全问题。",
                },
                {
                    "title": "算法偏见",
                    "text": "训练数据中的偏见可能导致 AI 决策不公平，需建立公平性审计机制。",
                },
                {
                    "title": "AI 对齐",
                    "text": "确保高级 AI 系统的目标与人类价值观一致，是长期安全的核心挑战。",
                },
                {
                    "title": "监管框架",
                    "text": "各国亟需建立适应性强的 AI 监管政策，平衡创新与安全。",
                },
            ],
        },
    },
    {
        "type": "transition",
        "data": {
            "title": "应用领域展望",
            "text": "AI 正在深度渗透医疗、金融、制造、创意产业等核心领域。",
        },
    },
    {
        "type": "content",
        "data": {
            "title": "四大应用领域",
            "items": [
                {
                    "title": "医疗健康",
                    "text": "辅助影像诊断、药物分子设计、基因组学分析，显著提升诊疗效率。",
                },
                {
                    "title": "金融科技",
                    "text": "智能风控、欺诈实时检测、量化交易与个性化理财顾问。",
                },
                {
                    "title": "智能制造",
                    "text": "预测性维护、质量视觉检测、自动化排产与供应链优化。",
                },
                {
                    "title": "内容创作",
                    "text": "文本、图像、音视频生成，重塑媒体与创意产业生产流程。",
                },
            ],
        },
    },
    {
        "type": "transition",
        "data": {
            "title": "未来发展方向",
            "text": "多模态、Agent、具身智能将定义下一代 AI 技术格局。",
        },
    },
    {
        "type": "content",
        "data": {
            "title": "AI 发展里程碑",
            "items": [
                {
                    "title": "2012：深度学习爆发",
                    "text": "AlexNet 在 ImageNet 上取得突破，开启深度学习视觉革命。",
                },
                {
                    "title": "2017：Transformer 诞生",
                    "text": "Attention Is All You Need 发布，奠定大模型时代基础。",
                },
                {
                    "title": "2022：大模型浪潮",
                    "text": "ChatGPT 引爆全球关注，AI 应用进入爆发期。",
                },
                {
                    "title": "2025+：Agent 时代",
                    "text": "多模态 Agent 走向生产环境，AI 从工具进化为协作伙伴。",
                },
            ],
        },
    },
    {"type": "end"},
]


MOCK_OUTLINE = """# 人工智能的未来

## AI 核心技术概览
- 深度学习是当代 AI 的核心驱动力，模拟人脑多层神经网络
- 自然语言处理让机器理解和生成人类语言，ChatGPT 是代表
- 计算机视觉赋予机器识别图像与视频的能力
- 强化学习通过奖惩机制训练自主决策智能体

## 产业规模与市场趋势
- 2030 年全球 AI 市场规模预计达 1.8 万亿美元
- AI 相关领域预计新增 9700 万就业岗位
- 已采用 AI 的企业平均生产力提升 40%

## 机遇与挑战并存
- AI 辅助影像诊断准确率超过 95%，药物研发周期大幅缩短
- 数据隐私保护与算法偏见问题亟待解决
- AI 对齐与安全监管框架建设刻不容缓

## 重点应用领域展望
- 医疗健康：辅助影像诊断、药物分子设计、基因组学分析
- 金融科技：智能风控、欺诈实时检测、量化交易
- 智能制造：预测性维护、质量视觉检测、供应链优化
- 内容创作：文本、图像、音视频生成重塑创意产业

## 未来发展方向
- 多模态大模型将成为 AI 下一个重大突破方向
- Agent 自主决策系统正走向生产环境落地
- 具身智能让 AI 走出屏幕，融入物理世界"""


def _is_mock_mode() -> bool:
    """判断是否应使用 mock 数据（没有配置任何真实 API Key）"""
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    if provider == "gemini":
        key = os.getenv("GEMINI_API_KEY", "")
        return not key or key.startswith("AIzaSy-xxxxx")
    else:
        key = os.getenv("LLM_API_KEY", "")
        return not key or key.startswith("sk-xxxxx")


async def generate_outline(
    topic: str, language: str = "中文", enable_search: bool = False
) -> str:
    """
    生成演示文稿大纲（Markdown 格式，非流式）。

    返回 Markdown 字符串，格式为：
      # 标题
      ## 章节1
      - 要点1
      ...
    """
    if _is_mock_mode():
        logger.info("使用 mock 大纲数据")
        await asyncio.sleep(0.5)
        return MOCK_OUTLINE

    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    logger.info(
        f"调用 [{provider}] 生成大纲，主题：{topic}，RAG增强：{'开' if enable_search else '关'}"
    )

    search_context = ""
    if enable_search:
        from app.services.search_service import fetch_search_results

        queries = _build_outline_queries(topic)
        search_context = await fetch_search_results(queries)
        logger.info(f"RAG 召回上下文长度：{len(search_context)}")

    if provider == "gemini":
        return await _generate_outline_gemini(topic, language, search_context)
    else:
        return await _generate_outline_openai(topic, language, search_context)


async def _generate_outline_openai(
    topic: str, language: str, search_context: str = ""
) -> str:
    """调用 OpenAI 兼容 API 生成大纲"""
    import openai
    from app.prompts.outline_prompt import build_outline_prompt

    client = openai.AsyncOpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
    )

    content = build_outline_prompt(topic, language, search_context)
    response = await client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[{"role": "user", "content": content}],
        temperature=0.7,
        stream=False,
    )
    return response.choices[0].message.content or ""


async def _generate_outline_gemini(
    topic: str, language: str, search_context: str = ""
) -> str:
    """调用 Google Gemini API 生成大纲"""
    from google import genai
    from google.genai import types
    from app.prompts.outline_prompt import build_outline_prompt

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    content = build_outline_prompt(topic, language, search_context)
    response = await client.aio.models.generate_content(
        model=model,
        contents=content,
        config=types.GenerateContentConfig(temperature=0.7),
    )
    return response.text or ""


def _build_outline_queries(topic: str) -> list[str]:
    """为大纲生成构建检索查询列表"""
    return [
        topic,
        f"{topic} 背景",
        f"{topic} 核心要点",
        f"{topic} 应用场景",
    ]


async def ai_writing_stream(content: str, command: str) -> AsyncGenerator[str, None]:
    """
    流式文本处理（美化改写 / 扩写丰富 / 精简提炼）。
    直接 yield 纯文本片段（非 SSE 格式），前端直接拼接显示。
    """
    from app.prompts.writing_prompt import WRITING_COMMANDS, DEFAULT_COMMAND

    system_prompt = WRITING_COMMANDS.get(command, WRITING_COMMANDS[DEFAULT_COMMAND])

    if _is_mock_mode():
        mock_texts = {
            "美化改写": f"（美化示例）{content[:20]}……经过精心润色，语言更加生动优美。",
            "扩写丰富": f"（扩写示例）{content[:20]}……本段内容可进一步展开：补充相关背景、列举典型案例，使论述更加完整充实。",
            "精简提炼": content[:30] + "（精简示例）",
        }
        text = mock_texts.get(command, content)
        for ch in text:
            await asyncio.sleep(0.02)
            yield ch
        return

    provider = os.getenv("LLM_PROVIDER", "openai").lower()

    if provider == "gemini":
        async for chunk in _ai_writing_gemini(system_prompt, content):
            yield chunk
    else:
        async for chunk in _ai_writing_openai(system_prompt, content):
            yield chunk


async def _ai_writing_openai(
    system_prompt: str, content: str
) -> AsyncGenerator[str, None]:
    import openai

    client = openai.AsyncOpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
    )
    response = await client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ],
        stream=True,
        temperature=0.7,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield delta


async def _ai_writing_gemini(
    system_prompt: str, content: str
) -> AsyncGenerator[str, None]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    prompt = f"{system_prompt}\n\n{content}"
    async for chunk in await client.aio.models.generate_content_stream(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.7),
    ):
        delta = chunk.text or ""
        if delta:
            yield delta


def parse_outline_to_tasks(outline: str) -> list[dict]:
    """从大纲中提取生成任务（逐页）"""
    tasks = []
    lines = outline.strip().split("\n")
    current_section = ""
    for line in lines:
        line = line.strip()
        if line.startswith("## "):
            current_section = line[3:].strip()
            tasks.append({"type": "transition", "title": current_section})
        elif line.startswith("- "):
            point = line[2:].strip()
            short_point = point.split("，")[0].split("。")[0]
            query = (
                f"{current_section} {short_point}" if current_section else short_point
            )
            tasks.append(
                {
                    "type": "content",
                    "section": current_section,
                    "point": point,
                    "query": query,
                }
            )
    return tasks


async def stream_slides(
    topic: str,
    num_slides: int,
    outline: str = "",
    enable_image: bool = False,
    enable_search: bool = False,
) -> AsyncGenerator[str, None]:
    """
    流式生成幻灯片 JSON 字符串（PPTist AIPPT 格式）。

    根据 LLM_PROVIDER 环境变量自动选择调用方式：
      - openai（默认）：OpenAI / DeepSeek / Moonshot / 通义千问等兼容接口
      - gemini：Google Gemini API
    未配置真实 Key 时自动降级为 mock 模式。
    """
    if _is_mock_mode():
        logger.info("使用 mock 数据模式（未配置真实 API Key）")
        async for slide_json in _stream_mock_slides(topic, num_slides):
            yield slide_json
        return

    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    logger.info(
        f"调用 [{provider}] 生成幻灯片，主题：{topic}，页数：{num_slides}，大纲：{'有' if outline else '无'}，配图：{'开' if enable_image else '关'}，RAG增强：{'开' if enable_search else '关'}"
    )

    if outline and enable_search:
        # 开启 RAG 检索时，采用流水线逐页生成模式，以便在一页生成的等待时间内并发检索下一页的资料
        async for slide_json in _stream_pipelined_slides(
            topic, num_slides, outline, enable_image, provider
        ):
            yield slide_json
        return

    # 未开启 RAG 时，使用全量一次性推流（速度更快）
    if provider == "gemini":
        async for slide_json in _stream_gemini_slides(
            topic, num_slides, outline, enable_image, ""
        ):
            yield slide_json
    else:
        async for slide_json in _stream_openai_slides(
            topic, num_slides, outline, enable_image, ""
        ):
            yield slide_json


async def _stream_pipelined_slides(
    topic: str, num_slides: int, outline: str, enable_image: bool, provider: str
) -> AsyncGenerator[str, None]:
    """流水线模式：在一页生成时，同时在后台检索下一页的 RAG 资料"""
    from app.prompts.system_prompt import build_page_by_page_system_prompt
    from app.services.search_service import fetch_single_query
    import httpx

    system_prompt = build_page_by_page_system_prompt(topic, outline, enable_image)

    openai_client = None
    gemini_client = None
    if provider == "gemini":
        from google import genai
        from google.genai import types

        gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    else:
        import openai

        openai_client = openai.AsyncOpenAI(
            api_key=os.getenv("LLM_API_KEY"),
            base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
        )
        openai_model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    async def generate_llm(user_prompt):
        buffer = ""
        if provider == "gemini":
            from google.genai import types

            async for chunk in await gemini_client.aio.models.generate_content_stream(
                model=gemini_model,
                contents=f"{system_prompt}\n\n{user_prompt}",
                config=types.GenerateContentConfig(temperature=0.7),
            ):
                delta = chunk.text or ""
                buffer += delta
                slides, buffer = _parse_buffer(buffer)
                for s in slides:
                    yield s
        else:
            response = await openai_client.chat.completions.create(
                model=openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
                temperature=0.7,
            )
            async for chunk in response:
                delta = chunk.choices[0].delta.content or ""
                buffer += delta
                slides, buffer = _parse_buffer(buffer)
                for s in slides:
                    yield s

        buffer = _strip_code_fences(buffer.strip())
        if buffer:
            try:
                json.loads(buffer)
                yield buffer
            except json.JSONDecodeError:
                pass

    tasks = parse_outline_to_tasks(outline)

    # 1. 生成封面与目录
    async for s in generate_llm(
        "请生成开头两页：1. cover（封面页），2. contents（目录页，包含大纲中的所有章节）。严格按照格式，用 ---SLIDE_BREAK--- 分隔这两页。"
    ):
        yield s

    # 2. 并发检索流水线
    http_client = httpx.AsyncClient()
    next_search_index = 0

    def start_next_search():
        nonlocal next_search_index
        while next_search_index < len(tasks):
            t = tasks[next_search_index]
            if t["type"] == "content":
                task = asyncio.create_task(fetch_single_query(http_client, t["query"]))
                idx = next_search_index
                next_search_index += 1
                return idx, task
            next_search_index += 1
        return None, None

    next_idx, current_search_task = start_next_search()

    for i, task in enumerate(tasks):
        if task["type"] == "transition":
            prompt = f"请为章节「{task['title']}」生成一页 transition（章节过渡页）。只需输出一个 JSON。"
            async for s in generate_llm(prompt):
                yield s
        elif task["type"] == "content":
            rag_context = ""
            if next_idx == i and current_search_task:
                rag_context = await current_search_task
                next_idx, current_search_task = start_next_search()

            context_str = f"\n\n参考资料：\n{rag_context}" if rag_context else ""
            prompt = f"请为当前大纲知识点「{task['point']}」生成 1 页 content（内容页）。要求结合参考资料扩充细节。{context_str}\n只需输出一个 JSON。"
            async for s in generate_llm(prompt):
                yield s

    # 3. 生成结束页
    async for s in generate_llm("请生成最后一页：end（结束页）。只需输出一个 JSON。"):
        yield s

    await http_client.aclose()


async def _stream_mock_slides(topic: str, num_slides: int) -> AsyncGenerator[str, None]:
    """模拟流式推送，每 0.5 秒推送一页"""
    # 使用全部 mock 数据，截取到 num_slides 页
    slides_to_send = MOCK_SLIDES[:num_slides]

    for slide in slides_to_send:
        await asyncio.sleep(0.5)
        yield json.dumps(slide, ensure_ascii=False)


def _strip_code_fences(text: str) -> str:
    """去除 LLM 输出中可能包裹的 Markdown 代码围栏（```json ... ```）。"""
    import re

    # 去除开头的 ```json 或 ``` 标记
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    # 去除结尾的 ``` 标记
    text = re.sub(r"\n?```\s*$", "", text)
    return text


def _parse_buffer(buffer: str):
    """
    从 buffer 中逐个提取以 ---SLIDE_BREAK--- 分隔的 JSON 片��。
    返回 (已提取的 slide_json 列表, 剩余 buffer)。
    """
    results = []
    while "---SLIDE_BREAK---" in buffer:
        slide_str, buffer = buffer.split("---SLIDE_BREAK---", 1)
        slide_str = _strip_code_fences(slide_str.strip())
        if slide_str:
            try:
                json.loads(slide_str)  # 校验 JSON 合法性
                results.append(slide_str)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON 解析失败，跳过该页: {e}")
    return results, buffer


async def _stream_openai_slides(
    topic: str,
    num_slides: int,
    outline: str = "",
    enable_image: bool = False,
    search_context: str = "",
) -> AsyncGenerator[str, None]:
    """调用 OpenAI 兼容 API（OpenAI / DeepSeek / Moonshot / 通义千问等）"""
    import openai
    from app.prompts.system_prompt import (
        build_system_prompt,
        build_system_prompt_with_outline,
    )

    client = openai.AsyncOpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
    )

    if outline:
        system_content = build_system_prompt_with_outline(
            topic, num_slides, outline, enable_image, search_context
        )
        user_content = (
            f"请严格按照已确认的大纲，为主题「{topic}」生成约 {num_slides} 页幻灯片。"
        )
    else:
        system_content = build_system_prompt(topic, num_slides, enable_image)
        user_content = f"请为主题「{topic}」生成约 {num_slides} 页幻灯片。"

    response = await client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ],
        stream=True,
        temperature=0.7,
    )

    buffer = ""
    async for chunk in response:
        delta = chunk.choices[0].delta.content or ""
        buffer += delta
        slides, buffer = _parse_buffer(buffer)
        for s in slides:
            yield s

    # 处理最后一页（无尾部分隔符）
    buffer = _strip_code_fences(buffer.strip())
    if buffer:
        try:
            json.loads(buffer)
            yield buffer
        except json.JSONDecodeError as e:
            logger.warning(f"最后一页 JSON 解析失败: {e}")


async def _stream_gemini_slides(
    topic: str,
    num_slides: int,
    outline: str = "",
    enable_image: bool = False,
    search_context: str = "",
) -> AsyncGenerator[str, None]:
    """调用 Google Gemini API"""
    from google import genai
    from google.genai import types
    from app.prompts.system_prompt import (
        build_system_prompt,
        build_system_prompt_with_outline,
    )

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    if outline:
        prompt = (
            build_system_prompt_with_outline(
                topic, num_slides, outline, enable_image, search_context
            )
            + f"\n\n请严格按照已确认的大纲，为主题「{topic}」生成约 {num_slides} 页幻灯片。"
        )
    else:
        prompt = (
            build_system_prompt(topic, num_slides, enable_image)
            + f"\n\n请为主题「{topic}」生成约 {num_slides} 页幻灯片。"
        )

    buffer = ""
    async for chunk in await client.aio.models.generate_content_stream(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.7),
    ):
        delta = chunk.text or ""
        buffer += delta
        slides, buffer = _parse_buffer(buffer)
        for s in slides:
            yield s

    # 处理最后一页
    buffer = _strip_code_fences(buffer.strip())
    if buffer:
        try:
            json.loads(buffer)
            yield buffer
        except json.JSONDecodeError as e:
            logger.warning(f"最后一页 JSON 解析失败: {e}")
