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
            "text": "探索 AI 技术如何深刻改变我们的世界与生活方式"
        }
    },
    {
        "type": "contents",
        "data": {
            "items": [
                "AI 核心技术概览",
                "产业规模与趋势",
                "机遇与挑战",
                "应用领域展望",
                "未来发展方向"
            ]
        }
    },
    {
        "type": "transition",
        "data": {
            "title": "AI 核心技术概览",
            "text": "本章将介绍深度学习、NLP、计算机视觉等关键技术。"
        }
    },
    {
        "type": "content",
        "data": {
            "title": "四大核心技术",
            "items": [
                {
                    "title": "深度学习",
                    "text": "模拟人脑神经网络的多层算法结构，是当代 AI 的核心驱动力。"
                },
                {
                    "title": "自然语言处理",
                    "text": "让机器理解和生成人类语言，ChatGPT 是其代表性应用。"
                },
                {
                    "title": "计算机视觉",
                    "text": "赋予机器识别图像与视频的能力，广泛用于自动驾驶和医学影像。"
                },
                {
                    "title": "强化学习",
                    "text": "通过奖惩机制训练自主决策智能体，AlphaGo 是经典案例。"
                }
            ]
        }
    },
    {
        "type": "transition",
        "data": {
            "title": "产业规模与趋势",
            "text": "全球 AI 产业正以惊人速度增长，深刻影响各行各业。"
        }
    },
    {
        "type": "content",
        "data": {
            "title": "AI 产业规模一览",
            "items": [
                {
                    "title": "市场规模",
                    "text": "2030 年全球 AI 市场规模预计达 1.8 万亿美元，年复合增长率超 35%。"
                },
                {
                    "title": "就业影响",
                    "text": "AI 相关领域预计创造 9700 万个新增就业岗位，同时重塑现有职业结构。"
                },
                {
                    "title": "生产力提升",
                    "text": "已采用 AI 的企业平均生产力提升 40%，运营成本降低 25%。"
                }
            ]
        }
    },
    {
        "type": "transition",
        "data": {
            "title": "机遇与挑战",
            "text": "AI 发展带来巨大机遇的同时，也面临伦理与安全挑战。"
        }
    },
    {
        "type": "content",
        "data": {
            "title": "核心机遇",
            "items": [
                {
                    "title": "医疗革命",
                    "text": "AI 辅助影像诊断准确率超过 95%，药物研发周期缩短 60%。"
                },
                {
                    "title": "教育个性化",
                    "text": "自适应学习系统根据每个学生的进度和能力定制教学方案。"
                },
                {
                    "title": "科学加速",
                    "text": "AI 帮助科学家从海量数据中发现新规律，加速科研突破。"
                }
            ]
        }
    },
    {
        "type": "content",
        "data": {
            "title": "主要挑战",
            "items": [
                {
                    "title": "数据隐私",
                    "text": "AI 系统对大规模数据的依赖引发个人隐私保护和数据安全问题。"
                },
                {
                    "title": "算法偏见",
                    "text": "训练数据中的偏见可能导致 AI 决策不公平，需建立公平性审计机制。"
                },
                {
                    "title": "AI 对齐",
                    "text": "确保高级 AI 系统的目标与人类价值观一致，是长期安全的核心挑战。"
                },
                {
                    "title": "监管框架",
                    "text": "各国亟需建立适应性强的 AI 监管政策，平衡创新与安全。"
                }
            ]
        }
    },
    {
        "type": "transition",
        "data": {
            "title": "应用领域展望",
            "text": "AI 正在深度渗透医疗、金融、制造、创意产业等核心领域。"
        }
    },
    {
        "type": "content",
        "data": {
            "title": "四大应用领域",
            "items": [
                {
                    "title": "医疗健康",
                    "text": "辅助影像诊断、药物分子设计、基因组学分析，显著提升诊疗效率。"
                },
                {
                    "title": "金融科技",
                    "text": "智能风控、欺诈实时检测、量化交易与个性化理财顾问。"
                },
                {
                    "title": "智能制造",
                    "text": "预测性维护、质量视觉检测、自动化排产与供应链优化。"
                },
                {
                    "title": "内容创作",
                    "text": "文本、图像、音视频生成，重塑媒体与创意产业生产流程。"
                }
            ]
        }
    },
    {
        "type": "transition",
        "data": {
            "title": "未来发展方向",
            "text": "多模态、Agent、具身智能将定义下一代 AI 技术格局。"
        }
    },
    {
        "type": "content",
        "data": {
            "title": "AI 发展里程碑",
            "items": [
                {
                    "title": "2012：深度学习爆发",
                    "text": "AlexNet 在 ImageNet 上取得突破，开启深度学习视觉革命。"
                },
                {
                    "title": "2017：Transformer 诞生",
                    "text": "Attention Is All You Need 发布，奠定大模型时代基础。"
                },
                {
                    "title": "2022：大模型浪潮",
                    "text": "ChatGPT 引爆全球关注，AI 应用进入爆发期。"
                },
                {
                    "title": "2025+：Agent 时代",
                    "text": "多模态 Agent 走向生产环境，AI 从工具进化为协作伙伴。"
                }
            ]
        }
    },
    {
        "type": "end"
    }
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


async def generate_outline(topic: str, language: str = "中文") -> str:
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
    logger.info(f"调用 [{provider}] 生成大纲，主题：{topic}")

    if provider == "gemini":
        return await _generate_outline_gemini(topic, language)
    else:
        return await _generate_outline_openai(topic, language)


async def _generate_outline_openai(topic: str, language: str) -> str:
    """调用 OpenAI 兼容 API 生成大纲"""
    import openai
    from app.prompts.outline_prompt import OUTLINE_PROMPT

    client = openai.AsyncOpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    )

    response = await client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[
            {
                "role": "user",
                "content": OUTLINE_PROMPT.format(topic=topic, language=language)
            }
        ],
        temperature=0.7,
        stream=False,
    )
    return response.choices[0].message.content or ""


async def _generate_outline_gemini(topic: str, language: str) -> str:
    """调用 Google Gemini API 生成大纲"""
    from google import genai
    from google.genai import types
    from app.prompts.outline_prompt import OUTLINE_PROMPT

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    response = await client.aio.models.generate_content(
        model=model,
        contents=OUTLINE_PROMPT.format(topic=topic, language=language),
        config=types.GenerateContentConfig(temperature=0.7),
    )
    return response.text or ""


async def stream_slides(topic: str, num_slides: int, outline: str = "") -> AsyncGenerator[str, None]:
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
    logger.info(f"调用 [{provider}] 生成幻灯片，主题：{topic}，页数：{num_slides}，大纲：{'有' if outline else '无'}")

    if provider == "gemini":
        async for slide_json in _stream_gemini_slides(topic, num_slides, outline):
            yield slide_json
    else:
        async for slide_json in _stream_openai_slides(topic, num_slides, outline):
            yield slide_json


async def _stream_mock_slides(topic: str, num_slides: int) -> AsyncGenerator[str, None]:
    """模拟流式推送，每 0.5 秒推送一页"""
    # 使用全部 mock 数据，截取到 num_slides 页
    slides_to_send = MOCK_SLIDES[:num_slides]

    for slide in slides_to_send:
        await asyncio.sleep(0.5)
        yield json.dumps(slide, ensure_ascii=False)


def _parse_buffer(buffer: str):
    """
    从 buffer 中逐个提取以 ---SLIDE_BREAK--- 分隔的 JSON 片段。
    返回 (已提取的 slide_json 列表, 剩余 buffer)。
    """
    results = []
    while "---SLIDE_BREAK---" in buffer:
        slide_str, buffer = buffer.split("---SLIDE_BREAK---", 1)
        slide_str = slide_str.strip()
        if slide_str:
            try:
                json.loads(slide_str)  # 校验 JSON 合法性
                results.append(slide_str)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON 解析失败，跳过该页: {e}")
    return results, buffer


async def _stream_openai_slides(topic: str, num_slides: int, outline: str = "") -> AsyncGenerator[str, None]:
    """调用 OpenAI 兼容 API（OpenAI / DeepSeek / Moonshot / 通义千问等）"""
    import openai
    from app.prompts.system_prompt import SYSTEM_PROMPT, SYSTEM_PROMPT_WITH_OUTLINE

    client = openai.AsyncOpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    )

    if outline:
        system_content = SYSTEM_PROMPT_WITH_OUTLINE.format(
            topic=topic, num_slides=num_slides, outline=outline
        )
        user_content = f"请严格按照已确认的大纲，为主题「{topic}」生成约 {num_slides} 页幻灯片。"
    else:
        system_content = SYSTEM_PROMPT.format(topic=topic, num_slides=num_slides)
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
    buffer = buffer.strip()
    if buffer:
        try:
            json.loads(buffer)
            yield buffer
        except json.JSONDecodeError as e:
            logger.warning(f"最后一页 JSON 解析失败: {e}")


async def _stream_gemini_slides(topic: str, num_slides: int, outline: str = "") -> AsyncGenerator[str, None]:
    """调用 Google Gemini API"""
    from google import genai
    from google.genai import types
    from app.prompts.system_prompt import SYSTEM_PROMPT, SYSTEM_PROMPT_WITH_OUTLINE

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    if outline:
        base_prompt = SYSTEM_PROMPT_WITH_OUTLINE.format(
            topic=topic, num_slides=num_slides, outline=outline
        )
        prompt = base_prompt + f"\n\n请严格按照已确认的大纲，为主题「{topic}」生成约 {num_slides} 页幻灯片。"
    else:
        prompt = (
            SYSTEM_PROMPT.format(topic=topic, num_slides=num_slides)
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
    buffer = buffer.strip()
    if buffer:
        try:
            json.loads(buffer)
            yield buffer
        except json.JSONDecodeError as e:
            logger.warning(f"最后一页 JSON 解析失败: {e}")
