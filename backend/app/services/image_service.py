"""
图片获取服务 — 多级降级策略

优先级：Pexels API → Gemini Imagen → 本地模型 → Picsum（保底）

配置说明（backend/.env）：
  PEXELS_API_KEY       - Pexels 图片搜索（https://www.pexels.com/api/，免费）
  GEMINI_API_KEY       - Google Gemini Imagen 生成（与文本生成共用）
  LOCAL_IMAGE_MODEL_URL - 本地图片生成服务地址（见 instruction.md）
"""

import os
import base64
import logging
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

PEXELS_API_BASE = "https://api.pexels.com/v1"


# ─── 配置检测 ────────────────────────────────────────────────

def _pexels_key() -> str:
    key = os.getenv("PEXELS_API_KEY", "")
    return key if (key and not key.startswith("your_pexels")) else ""

def _gemini_key() -> str:
    key = os.getenv("GEMINI_API_KEY", "")
    return key if (key and not key.startswith("AIzaSy-")) else ""

def _local_image_url() -> str:
    return os.getenv("LOCAL_IMAGE_MODEL_URL", "").rstrip("/")


# ─── 公共入口 ────────────────────────────────────────────────

async def get_image_for_keyword(keyword: str) -> str:
    """
    按优先级获取与关键词相关的图片 URL。
    始终返回可用 URL（最差情况返回 Picsum 随机图）。
    """
    # 1. Pexels 搜索
    if _pexels_key():
        url = await _pexels_search(keyword)
        if url:
            logger.debug(f"图片来源：Pexels [{keyword}]")
            return url

    # 2. Gemini Imagen 生成
    if _gemini_key():
        url = await _gemini_generate(keyword)
        if url:
            logger.debug(f"图片来源：Gemini Imagen [{keyword}]")
            return url

    # 3. 本地模型
    if _local_image_url():
        url = await _local_generate(keyword)
        if url:
            logger.debug(f"图片来源：本地模型 [{keyword}]")
            return url

    # 4. Picsum 保底（基于关键词生成确定性随机图）
    logger.debug(f"图片来源：Picsum 保底 [{keyword}]")
    return _picsum_url(keyword)


async def search_images(
    query: str,
    per_page: int = 20,
    page: int = 1,
    orientation: str = "all",
) -> dict:
    """图片库搜索接口，供 ImageLibPanel.vue 调用。"""
    if not _pexels_key():
        logger.warning("PEXELS_API_KEY 未配置，图片库不可用")
        return {"data": [], "total": 0}

    params: dict = {"query": query, "per_page": min(per_page, 80), "page": page}
    if orientation != "all":
        params["orientation"] = orientation

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{PEXELS_API_BASE}/search",
                headers={"Authorization": _pexels_key()},
                params=params,
            )
            resp.raise_for_status()
            body = resp.json()

        photos = [
            {
                "id": p["id"],
                "width": p["width"],
                "height": p["height"],
                "src": p["src"].get("large", p["src"].get("medium", p["src"]["original"])),
            }
            for p in body.get("photos", [])
        ]
        return {"data": photos, "total": body.get("total_results", 0)}

    except Exception as e:
        logger.error(f"Pexels 搜索异常: {e}")
        return {"data": [], "total": 0}


# ─── 各级实现 ────────────────────────────────────────────────

async def _pexels_search(keyword: str) -> str:
    """从 Pexels 搜索第一张图，返回 URL；失败返回空字符串。"""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{PEXELS_API_BASE}/search",
                headers={"Authorization": _pexels_key()},
                params={"query": keyword, "per_page": 1, "orientation": "landscape"},
            )
            resp.raise_for_status()
            photos = resp.json().get("photos", [])
            if photos:
                return photos[0]["src"].get("large", photos[0]["src"]["medium"])
    except Exception as e:
        logger.warning(f"Pexels 搜索失败: {e}")
    return ""


async def _gemini_generate(keyword: str) -> str:
    """
    使用 Gemini 图片生成模型生成图片，返回 base64 data URL；失败返回空字符串。
    使用模型：gemini-2.0-flash-preview-image-generation
    注：该功能需要 Google AI Studio API Key，且模型需支持图片生成能力。
    """
    try:
        import asyncio
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=_gemini_key())
        prompt = (
            f"A high-quality professional photograph suitable for a business presentation slide, "
            f"topic: {keyword}. Clean composition, no text, suitable as a slide background or illustration."
        )

        def _sync_generate():
            return client.models.generate_content(
                model="gemini-2.0-flash-preview-image-generation",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )

        response = await asyncio.to_thread(_sync_generate)

        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                mime = part.inline_data.mime_type or "image/jpeg"
                b64 = base64.b64encode(part.inline_data.data).decode()
                return f"data:{mime};base64,{b64}"

    except Exception as e:
        logger.warning(f"Gemini 图片生成失败: {e}")
    return ""


async def _local_generate(keyword: str) -> str:
    """
    调用本地图片生成服务，返回 URL 或 base64 data URL；失败返回空字符串。
    协议详见 instruction.md。
    """
    base_url = _local_image_url()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/generate",
                json={"prompt": keyword, "width": 800, "height": 450},
            )
            resp.raise_for_status()
            body = resp.json()

            if body.get("type") == "url":
                return body["data"]
            elif body.get("type") == "base64":
                return body["data"]  # 已是 data:image/...;base64,... 格式

    except Exception as e:
        logger.warning(f"本地图片生成服务失败: {e}")
    return ""


def _picsum_url(keyword: str) -> str:
    """Picsum 保底图（无 API Key，基于 keyword 生成确定性图片）。"""
    seed = quote(keyword.lower().replace(" ", "-"))
    return f"https://picsum.photos/seed/{seed}/800/450"
