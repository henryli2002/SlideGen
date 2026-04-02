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
from pydantic import ValidationError

from app.schemas.slide_schema import AIPPTSlide
from app.services import llm_service

logger = logging.getLogger(__name__)

router = APIRouter()

# 限制同时生成数量（最多 5 个并发）
_semaphore = asyncio.Semaphore(5)


@router.get("/api/generate_stream")
async def generate_stream(
    topic: str = Query(..., max_length=200, description="演示文稿主题"),
    num_slides: int = Query(default=12, ge=6, le=30, description="幻灯片页数（含封面，默认 12 页）"),
    template_id: str = Query(default="default", description="模板 ID（预留：未来支持多模板）"),
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
                async for slide_json in llm_service.stream_slides(topic, num_slides):
                    try:
                        validated = AIPPTSlide.model_validate_json(slide_json)
                        payload = {
                            "status": "generating",
                            "slide": validated.model_dump(),
                            "index": page_index,
                            "templateId": template_id,  # 回传模板 ID，前端据此选择模板
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
