"""
Pydantic 数据模型 — 适配 PPTist AIPPT 格式

类型参考：https://github.com/pipipi-pikachu/PPTist/blob/master/src/types/AIPPT.ts
"""

from pydantic import BaseModel, model_validator
from typing import Literal, Optional


class AIPPTContentItem(BaseModel):
    """内容页中的单个条目"""
    title: str
    text: str


class AIPPTSlide(BaseModel):
    """
    单页幻灯片（SSE 流式推送单元）。
    type 决定页面类型，data 的结构随 type 变化。
    end 类型允许 data 为空，其他类型 data 必须存在。
    """
    type: Literal["cover", "contents", "transition", "content", "table", "end"]
    data: Optional[dict] = None

    @model_validator(mode='after')
    def validate_data_required(self):
        if self.type != "end" and not self.data:
            raise ValueError(f"type={self.type} 必须包含 data 字段")
        return self
