from pydantic import BaseModel
from typing import Literal
from enum import Enum


class LayoutType(str, Enum):
    # 封面类
    COVER_CENTERED = "cover_centered"
    COVER_LEFT_BOLD = "cover_left_bold"
    CLOSING_CTA = "closing_cta"
    # 章节类
    SECTION_DIVIDER = "section_divider"
    # 要点类
    BULLETS_ICON_LIST = "bullets_icon_list"
    BULLETS_CARD_GRID = "bullets_card_grid"
    # 数据类
    STATS_THREE_COLUMN = "stats_three_column"
    TIMELINE_HORIZONTAL = "timeline_horizontal"
    # 内容类
    SPLIT_TWO_COLUMN = "split_two_column"
    QUOTE_CENTERED = "quote_centered"


class SlidePayload(BaseModel):
    layout: LayoutType
    # 平铺的模板变量键值对，与各 layout_presets JSON 中 {{variable}} 一一对应
    data: dict[str, str]

    model_config = {"populate_by_name": True}


class PresentationPayload(BaseModel):
    schemaVersion: str = "1.0"
    theme: Literal["default", "dark", "corporate"] = "default"
    slides: list[SlidePayload]
