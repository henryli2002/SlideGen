import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.slide_schema import PresentationPayload
from app.services import pptx_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/export")
async def export_pptx(payload: PresentationPayload):
    """
    接收完整的演示文稿数据，生成并返回 .pptx 文件。
    """
    logger.info(f"导出 PPTX，共 {len(payload.slides)} 页，主题：{payload.theme}")

    file_bytes = pptx_service.build_pptx(payload)

    return StreamingResponse(
        file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": "attachment; filename=presentation.pptx"}
    )
