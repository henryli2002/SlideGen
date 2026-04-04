"""
SSE 流式生成路由 — 输出 PPTist AIPPT 格式

每页通过 SSE 推送一个 AIPPTSlide JSON 对象，前端收集后组装为完整数组
供 PPTist 的 AIPPT 模块消费。
"""

import json
import logging
import asyncio

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ValidationError

from app.schemas.slide_schema import AIPPTSlide
from app.services import llm_service
from app.services import image_service

logger = logging.getLogger(__name__)

router = APIRouter()

# 限制同时生成数量（最多 5 个并发）
_semaphore = asyncio.Semaphore(5)


class OutlineRequest(BaseModel):
    topic: str
    language: str = "中文"


@router.post("/api/generate_outline")
async def generate_outline(req: OutlineRequest):
    """
    生成演示文稿大纲（Markdown 格式，非流式）。

    前端展示给用户确认/编辑后，再调用 generate_stream 生成完整幻灯片。
    """
    outline_md = await llm_service.generate_outline(req.topic, req.language)
    return {"outline": outline_md}


class AIWritingRequest(BaseModel):
    content: str
    command: str = "美化改写"


@router.post("/api/ai_writing")
async def ai_writing(req: AIWritingRequest):
    """
    流式 AI 文本处理（美化改写 / 扩写丰富 / 精简提炼）。
    返回纯文本流，前端逐字追加到编辑区。
    """
    async def text_generator():
        async for chunk in llm_service.ai_writing_stream(req.content, req.command):
            yield chunk

    return StreamingResponse(
        text_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/api/search_images")
async def search_images(
    query: str = Query(..., description="搜索关键词"),
    per_page: int = Query(default=20, ge=1, le=80),
    page: int = Query(default=1, ge=1),
    orientation: str = Query(default="all", description="图片方向: landscape | portrait | square | all"),
):
    """
    图片搜索接口（基于 Pexels API）。
    需在 .env 中配置 PEXELS_API_KEY。
    """
    result = await image_service.search_images(query, per_page, page, orientation)
    return result


@router.get("/api/generate_image")
async def generate_image(
    keyword: str = Query(..., description="图片关键词（英文），触发 Pexels → Gemini → 本地模型 → Picsum 降级链"),
):
    """
    按关键词生成/搜索一张图片。
    降级顺序：Pexels 搜图 → Gemini Imagen → 本地模型 → Picsum 保底。
    """
    result = await image_service.get_image_for_keyword(keyword)
    return result


class SlideImageRequest(BaseModel):
    prompt: str
    width: int
    height: int


@router.post("/api/generate_slide_image")
async def generate_slide_image(req: SlideImageRequest):
    """
    Generate an image for a specific template slot.
    Uses slide content as prompt and targets exact slot dimensions.
    Frontend calls this after naturally selecting a template that has image slots.
    """
    result = await image_service.get_image_for_slide(req.prompt, req.width, req.height)
    return result


@router.get("/api/generate_stream")
async def generate_stream(
    topic: str = Query(..., max_length=200, description="演示文稿主题"),
    num_slides: int = Query(default=12, ge=6, le=30, description="幻灯片页数（含封面，默认 12 页）"),
    template_id: str = Query(default="default", description="模板 ID（预留：未来支持多模板）"),
    outline: str = Query(default="", description="已确认的大纲 Markdown（可选，提供后按大纲生成）"),
    enable_image: bool = Query(default=False, description="是否启用 AI 配图（含 imageKeyword 生成与图片解析）"),
):
    """
    流式生成幻灯片内容（PPTist AIPPT 格式）。

    返回 SSE 格式的数据流，每页生成后立即推送。
    前端负责收集所有页面组装为 AIPPTSlide[] 数组。

    参数：
    - topic: 演示文稿主题
    - num_slides: 目标页数
    - template_id: 模板 ID（预留接口，未来支持多模板选择）
    """
    async def event_generator():
        async with _semaphore:
            try:
                page_index = 0
                async for slide_json in llm_service.stream_slides(topic, num_slides, outline, enable_image):
                    try:
                        validated = AIPPTSlide.model_validate_json(slide_json)
                        slide_data = validated.model_dump()

                        payload = {
                            "status": "generating",
                            "slide": slide_data,
                            "index": page_index,
                            "templateId": template_id,
                        }
                        yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                        page_index += 1
                    except ValidationError as e:
                        logger.warning(f"LLM 输出格式异常，跳过该页: {e}")
                        continue

                # 所有页面推送完毕
                done_payload = {
                    "status": "done",
                    "total": page_index,
                    "templateId": template_id,
                }
                yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

            except Exception as e:
                logger.error(f"生成过程中发生异常: {e}", exc_info=True)
                error_payload = {"status": "error", "message": str(e)}
                yield f"data: {json.dumps(error_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
