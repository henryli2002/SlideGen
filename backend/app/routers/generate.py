import json
import logging
import asyncio

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from app.schemas.slide_schema import SlidePayload
from app.services import llm_service

logger = logging.getLogger(__name__)

router = APIRouter()

# 限制同时生成数量（最多 5 个并发）
_semaphore = asyncio.Semaphore(5)


@router.get("/api/generate_stream")
async def generate_stream(
    topic: str = Query(..., max_length=200, description="演示文稿主题"),
    num_slides: int = Query(default=6, ge=3, le=12, description="幻灯片页数（含封面，默认 6 页）")
):
    """
    流式生成幻灯片内容。
    返回 SSE 格式的数据流，每页生成后立即推送。
    """
    async def event_generator():
        async with _semaphore:
            try:
                async for slide_json in llm_service.stream_slides(topic, num_slides):
                    # 每一块做 Pydantic 校验，格式不合法则跳过
                    try:
                        validated = SlidePayload.model_validate_json(slide_json)
                        payload = {
                            "status": "generating",
                            "slide": validated.model_dump()
                        }
                        yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                    except ValidationError as e:
                        logger.warning(f"LLM 输出格式异常，跳过该页: {e}")
                        continue

                # 所有页面推送完毕，发送完成信号
                yield f"data: {json.dumps({'status': 'done'})}\n\n"

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
