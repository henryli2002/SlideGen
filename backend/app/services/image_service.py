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
import random
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

IMAGE_STYLE_MODIFIERS = [
    "cinematic", "photorealistic", "hyperrealistic", "minimalist", "modern",
    "corporate", "stock photo", "vibrant color", "dramatic lighting", "clean background"
]

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

async def get_image_for_keyword(keyword: str) -> dict:
    """
    按优先级获取与关键词相关的图片 URL。
    返回 {"url": ..., "source": "pexels"|"gemini"|"local"|"picsum", "failed": [...]}。
    """
    failed: list[str] = []

    # 1. Pexels 搜索
    if _pexels_key():
        url = await _pexels_search(keyword)
        if url:
            logger.debug(f"图片来源：Pexels [{keyword}]")
            return {"url": url, "source": "pexels", "failed": []}
        failed.append("Pexels")

    # 2. Gemini Imagen 生成
    if _gemini_key():
        url = await _gemini_generate(keyword)
        if url:
            logger.debug(f"图片来源：Gemini Imagen [{keyword}]")
            return {"url": url, "source": "gemini", "failed": failed}
        failed.append("Gemini")

    # 3. 本地模型
    if _local_image_url():
        url = await _local_generate(keyword)
        if url:
            logger.debug(f"图片来源：本地模型 [{keyword}]")
            return {"url": url, "source": "local", "failed": failed}
        failed.append("本地模型")

    # 4. Picsum 保底
    logger.debug(f"图片来源：Picsum [failed={failed}] [{keyword}]")
    return {"url": _picsum_url(keyword), "source": "picsum", "failed": failed}


async def get_image_for_slide(prompt: str, width: int, height: int) -> dict:
    """
    Generate an image sized to exactly match a template slot (width × height).

    Priority: Pexels (keyword extracted from prompt) → Gemini (full prompt, aspect-ratio hint)
              → local model → Picsum (exact pixel dimensions).

    Returns {"url": ..., "source": ..., "failed": [...]}.
    """
    logger.info(f"接到图片生成请求，原始 prompt: '{prompt}'")
    failed: list[str] = []
    # Extract a short keyword from the prompt for Pexels / Picsum seed
    keyword = prompt.split(":")[0].strip() if ":" in prompt else prompt.split(".")[0].split(",")[0].strip()
    logger.info(f"提取关键词: '{keyword}'")

    # 1. Pexels — search with keyword, prefer matching orientation
    if _pexels_key():
        orientation = "landscape" if width >= height else "portrait"
        logger.info(f"1. 尝试从 Pexels 搜索 (关键词: '{keyword}')...")
        url = await _pexels_search(keyword, orientation=orientation)
        if url:
            logger.info(f"✅ Pexels 成功，URL: {url[:60]}...")
            return {"url": url, "source": "pexels", "failed": []}
        logger.warning("Pexels 搜索无结果或失败")
        failed.append("Pexels")

    # 2. Gemini — use rich prompt with aspect-ratio hint and random style
    if _gemini_key():
        ratio_hint = _aspect_ratio_hint(width, height)
        style = random.choice(IMAGE_STYLE_MODIFIERS)
        full_prompt = f"{prompt}, in a {style} style. Aspect ratio: {ratio_hint}."
        logger.info(f"2. 尝试用 Gemini 生成 (prompt: '{full_prompt}')...")
        url = await _gemini_generate_with_prompt(full_prompt)
        if url:
            logger.info("✅ Gemini 生成成功")
            return {"url": url, "source": "gemini", "failed": failed}
        logger.warning("Gemini 生成失败")
        failed.append("Gemini")

    # 3. Local model - use random style
    if _local_image_url():
        style = random.choice(IMAGE_STYLE_MODIFIERS)
        modified_prompt = f"{prompt}, {style}"
        logger.info(f"3. 尝试用本地模型生成 (prompt: '{modified_prompt}')...")
        url = await _local_generate_sized(modified_prompt, width, height)
        if url:
            logger.info("✅ 本地模型生成成功")
            return {"url": url, "source": "local", "failed": failed}
        logger.warning("本地模型生成失败")
        failed.append("本地模型")

    # 4. Picsum — exact pixel dimensions, with a random seed component
    from urllib.parse import quote
    import time
    # Add timestamp to seed to ensure different images even for same keyword
    seed_str = f"{keyword.lower().replace(' ', '-')}-{time.time()}"
    seed = quote(seed_str)
    url = f"https://picsum.photos/seed/{seed}/{width}/{height}"
    logger.info(f"4. 使用 Picsum 作为备用: {url}")
    source = "picsum_no_api" if not failed else "picsum"
    return {"url": url, "source": source, "failed": failed}


def _aspect_ratio_hint(width: int, height: int) -> str:
    ratio = width / height
    candidates = {"1:1": 1.0, "4:3": 4/3, "3:4": 3/4, "16:9": 16/9, "9:16": 9/16, "3:2": 3/2, "2:3": 2/3}
    return min(candidates, key=lambda k: abs(candidates[k] - ratio))


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

async def _pexels_search(keyword: str, orientation: str = "landscape") -> str:
    """从 Pexels 搜索一组图片并随机返回一张，以增加多样性。"""
    try:
        # Pexels 每页最多 80 张，取 15 张在速度和多样性之间平衡
        # 增加随机页码，进一步提升多样性
        page = random.randint(1, 10)  # 在前 10 页中随机选一页
        params: dict = {"query": keyword, "per_page": 15, "page": page}
        if orientation != "all":
            params["orientation"] = orientation
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{PEXELS_API_BASE}/search",
                headers={"Authorization": _pexels_key()},
                params=params,
            )
            resp.raise_for_status()
            photos = resp.json().get("photos", [])
            if photos:
                photo = random.choice(photos)
                return photo["src"].get("large", photo["src"]["medium"])
    except Exception as e:
        logger.warning(f"Pexels 搜索失败: {e}")
    return ""


async def _gemini_generate(keyword: str) -> str:
    """
    使用 gemini-2.5-flash-image 生成图片（:generateContent 管道）。
    返回 base64 data URL；失败返回空字符串。
    """
    try:
        import asyncio
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=_gemini_key())
        prompt = (
            f"A high-quality professional photograph suitable for a business presentation slide, "
            f"topic: {keyword}. Clean composition, no text overlay, suitable as a slide illustration."
        )

        def _sync_generate():
            return client.models.generate_content(
                model="gemini-2.5-flash-image",
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


async def _gemini_generate_with_prompt(prompt: str) -> str:
    """Gemini image generation with a custom full prompt."""
    try:
        import asyncio
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=_gemini_key())

        def _sync_generate():
            return client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=prompt,
                config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
            )

        response = await asyncio.to_thread(_sync_generate)
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                mime = part.inline_data.mime_type or "image/jpeg"
                b64 = base64.b64encode(part.inline_data.data).decode()
                return f"data:{mime};base64,{b64}"
    except Exception as e:
        logger.warning(f"Gemini 图片生成失败（全提示词）: {e}")
    return ""


async def _local_generate_sized(prompt: str, width: int, height: int) -> str:
    """Call local image service with exact dimensions."""
    base_url = _local_image_url()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/generate",
                json={"prompt": prompt, "width": width, "height": height},
            )
            resp.raise_for_status()
            body = resp.json()
            if body.get("type") in ("url", "base64"):
                return body["data"]
    except Exception as e:
        logger.warning(f"本地图片生成服务失败: {e}")
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
