"""
Pydantic 数据模型 — 适配 PPTist AIPPT 格式

类型参考：https://github.com/pipipi-pikachu/PPTist/blob/master/src/types/AIPPT.ts
"""

from pydantic import BaseModel
from typing import Literal, Optional


class AIPPTContentItem(BaseModel):
    """内容页中的单个条目"""
    title: str
    text: str


class AIPPTSlide(BaseModel):
    """
    单页幻灯片（SSE 流式推送单元）。
    type 决定页面类型，data 的结构随 type 变化。
    """
    type: Literal["cover", "contents", "transition", "content", "table", "end"]
    data: Optional[dict] = None


# ===== 以下为具体类型的严格校验版本（供后续精细校验使用） =====

class AIPPTCover(BaseModel):
    type: Literal["cover"]
    data: dict  # {"title": str, "text": str}


class AIPPTContents(BaseModel):
    type: Literal["contents"]
    data: dict  # {"items": list[str]}
    offset: Optional[int] = None


class AIPPTTransition(BaseModel):
    type: Literal["transition"]
    data: dict  # {"title": str, "text": str}


class AIPPTContent(BaseModel):
    type: Literal["content"]
    data: dict  # {"title": str, "items": list[{"title": str, "text": str}]}
    offset: Optional[int] = None


class AIPPTEnd(BaseModel):
    type: Literal["end"]
    data: Optional[dict] = None
