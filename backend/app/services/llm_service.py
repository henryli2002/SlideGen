import os
import json
import logging
import asyncio
from typing import AsyncGenerator

from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

logger = logging.getLogger(__name__)

# Mock 幻灯片数据，未配置真实 API Key 时使用（覆盖所有 10 种布局）
MOCK_SLIDES = [
    {
        "layout": "cover_centered",
        "data": {
            "title": "人工智能的未来",
            "subtitle": "探索 AI 技术如何深刻改变我们的世界与生活方式"
        }
    },
    {
        "layout": "bullets_icon_list",
        "data": {
            "title": "AI 的四大核心技术",
            "bullet1": "深度学习：模拟人脑神经网络的多层算法结构",
            "bullet1_icon": "cpu",
            "bullet2": "自然语言处理：让机器理解和生成人类语言",
            "bullet2_icon": "book-open",
            "bullet3": "计算机视觉：赋予机器识别图像与视频的能力",
            "bullet3_icon": "globe",
            "bullet4": "强化学习：通过奖惩机制训练自主决策智能体",
            "bullet4_icon": "target",
            "bullet5": "",
            "bullet5_icon": ""
        }
    },
    {
        "layout": "stats_three_column",
        "data": {
            "title": "AI 产业规模一览",
            "stat1_number": "$1.8T",
            "stat1_label": "2030 年全球 AI 市场规模预测",
            "stat2_number": "97M",
            "stat2_label": "AI 相关新增就业岗位（2025）",
            "stat3_number": "40%",
            "stat3_label": "企业生产力平均提升幅度"
        }
    },
    {
        "layout": "split_two_column",
        "data": {
            "title": "机遇与挑战并存",
            "left_title": "核心机遇",
            "left_content": "自动化重复性工作、提升医疗诊断精度、加速科学研究发现、个性化教育体验、优化供应链与物流",
            "right_title": "主要挑战",
            "right_content": "就业结构深度变革、数据隐私与安全、算法偏见与公平性、AI 对齐问题、监管与伦理框架建立"
        }
    },
    {
        "layout": "bullets_card_grid",
        "data": {
            "title": "四大核心应用领域",
            "card1_title": "医疗健康",
            "card1_desc": "辅助影像诊断、药物分子设计、基因组学分析，显著提升诊疗效率",
            "card2_title": "金融科技",
            "card2_desc": "智能风控、欺诈实时检测、量化交易与个性化理财顾问",
            "card3_title": "智能制造",
            "card3_desc": "预测性维护、质量视觉检测、自动化排产与供应链优化",
            "card4_title": "内容创作",
            "card4_desc": "文本、图像、音视频生成，重塑媒体与创意产业生产流程"
        }
    },
    {
        "layout": "timeline_horizontal",
        "data": {
            "title": "AI 发展里程碑",
            "point1_time": "2012",
            "point1_text": "AlexNet 开创深度学习视觉革命",
            "point2_time": "2017",
            "point2_text": "Transformer 架构发布，NLP 飞跃",
            "point3_time": "2022",
            "point3_text": "ChatGPT 引爆大模型应用浪潮",
            "point4_time": "2025+",
            "point4_text": "多模态 Agent 走向生产环境"
        }
    },
    {
        "layout": "closing_cta",
        "data": {
            "title": "感谢聆听",
            "subtitle": "让我们共同拥抱智能时代，用 AI 创造更大的价值",
            "cta_text": "立即开始探索"
        }
    }
]


def _is_mock_mode() -> bool:
    """判断是否应使用 mock 数据（没有配置任何真实 API Key）"""
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    if provider == "gemini":
        key = os.getenv("GEMINI_API_KEY", "")
        return not key or key.startswith("AIzaSy-xxxxx")
    else:
        key = os.getenv("LLM_API_KEY", "")
        return not key or key.startswith("sk-xxxxx")


async def stream_slides(topic: str, num_slides: int) -> AsyncGenerator[str, None]:
    """
    流式生成幻灯片 JSON 字符串。
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
    logger.info(f"调用 [{provider}] 生成幻灯片，主题：{topic}，页数：{num_slides}")

    if provider == "gemini":
        async for slide_json in _stream_gemini_slides(topic, num_slides):
            yield slide_json
    else:
        # 默认走 OpenAI 兼容路径
        async for slide_json in _stream_openai_slides(topic, num_slides):
            yield slide_json


async def _stream_mock_slides(topic: str, num_slides: int) -> AsyncGenerator[str, None]:
    """模拟流式推送，每秒推送一页"""
    slides_to_send = list(MOCK_SLIDES[:num_slides])
    while len(slides_to_send) < num_slides:
        slides_to_send.append(MOCK_SLIDES[1])

    for slide in slides_to_send[:num_slides]:
        await asyncio.sleep(1)
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
                json.loads(slide_str)   # 校验 JSON 合法性
                results.append(slide_str)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON 解析失败，跳过该页: {e}")
    return results, buffer


async def _stream_openai_slides(topic: str, num_slides: int) -> AsyncGenerator[str, None]:
    """调用 OpenAI 兼容 API（OpenAI / DeepSeek / Moonshot / 通义千问等）"""
    import openai
    from app.prompts.system_prompt import SYSTEM_PROMPT

    client = openai.AsyncOpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    )

    response = await client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT.format(topic=topic, num_slides=num_slides)
            },
            {
                "role": "user",
                "content": f"请为主题「{topic}」生成 {num_slides} 页幻灯片。"
            }
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


async def _stream_gemini_slides(topic: str, num_slides: int) -> AsyncGenerator[str, None]:
    """调用 Google Gemini API"""
    from google import genai
    from google.genai import types
    from app.prompts.system_prompt import SYSTEM_PROMPT

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    prompt = (
        SYSTEM_PROMPT.format(topic=topic, num_slides=num_slides)
        + f"\n\n请为主题「{topic}」生成 {num_slides} 页幻灯片。"
    )

    buffer = ""
    # Gemini 的流式接口
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
