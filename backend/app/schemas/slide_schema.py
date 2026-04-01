from pydantic import BaseModel, Field
from typing import Literal, Union
from enum import Enum


class LayoutType(str, Enum):
    COVER = "cover"
    BULLETS = "bullets"
    SPLIT = "split"


class CoverData(BaseModel):
    title: str = Field(..., max_length=30)
    subtitle: str = Field(..., max_length=60)


class BulletsData(BaseModel):
    title: str = Field(..., max_length=30)
    bullets: list[str] = Field(..., min_length=3, max_length=6)


class SplitData(BaseModel):
    title: str = Field(..., max_length=30)
    leftContent: str = Field(..., max_length=120)
    rightContent: str = Field(..., max_length=120)


class SlidePayload(BaseModel):
    layout: LayoutType
    data: Union[CoverData, BulletsData, SplitData]

    model_config = {"populate_by_name": True}


class PresentationPayload(BaseModel):
    schemaVersion: str = "1.0"
    theme: Literal["default", "dark", "corporate"] = "default"
    slides: list[SlidePayload]
