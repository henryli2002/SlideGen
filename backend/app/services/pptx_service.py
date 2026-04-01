import io
import json
import logging
from pathlib import Path

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

from app.schemas.slide_schema import PresentationPayload

logger = logging.getLogger(__name__)

# 预设 JSON 文件目录
PRESET_DIR = Path(__file__).parent.parent / "layout_presets"

# 各主题的颜色配置（十六进制字符串，与前端保持一致）
THEME_COLOR_HEX = {
    "default": {
        "bg": "#FFFFFF",
        "accentColor": "#3B82F6",
        "titleColor": "#1F2937",
        "bodyColor": "#374151",
    },
    "dark": {
        "bg": "#1E293B",
        "accentColor": "#60A5FA",
        "titleColor": "#F1F5F9",
        "bodyColor": "#CBD5E1",
    },
    "corporate": {
        "bg": "#F8FAFC",
        "accentColor": "#1D4ED8",
        "titleColor": "#0F172A",
        "bodyColor": "#374151",
    },
}


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """将十六进制颜色转为 (R, G, B) 元组"""
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _blend(fg_hex: str, bg_hex: str, opacity: float) -> RGBColor:
    """将前景色以给定透明度混合到背景色上"""
    fr, fg, fb = _hex_to_rgb(fg_hex)
    br, bg_g, bb = _hex_to_rgb(bg_hex)
    r = int(br * (1 - opacity) + fr * opacity)
    g = int(bg_g * (1 - opacity) + fg * opacity)
    b = int(bb * (1 - opacity) + fb * opacity)
    return RGBColor(r, g, b)


def _resolve(tmpl: str, data: dict[str, str], theme_colors: dict[str, str]) -> str:
    """将 {{variable}} 替换为 data 或 theme_colors 中的值"""
    result = tmpl
    for k, v in data.items():
        result = result.replace(f"{{{{{k}}}}}", v)
    for k, v in theme_colors.items():
        result = result.replace(f"{{{{{k}}}}}", v)
    return result


def _load_preset(layout_name: str) -> dict:
    """从 layout_presets/ 目录加载对应 JSON"""
    path = PRESET_DIR / f"{layout_name}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _set_bg(slide, color: RGBColor):
    """设置幻灯片背景纯色"""
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def _add_textbox(slide, text: str, left, top, width, height,
                 font_size: int, color: RGBColor, bold: bool,
                 align=PP_ALIGN.LEFT):
    """添加文本框（微软雅黑，自动换行）"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    font = run.font
    font.name = "微软雅黑"
    font.size = Pt(font_size)
    font.color.rgb = color
    font.bold = bold


def _build_preset_slide(prs: Presentation, pptx_slide, layout_name: str, data: dict[str, str], theme: str):
    """
    通用预设幻灯片构建器。
    根据 layout_name 加载对应预设 JSON，解析元素并渲染到 pptx_slide 上。
    """
    try:
        preset = _load_preset(layout_name)
    except FileNotFoundError:
        logger.warning(f"未找到预设文件: {layout_name}.json，跳过该页")
        return

    theme_colors = THEME_COLOR_HEX.get(theme, THEME_COLOR_HEX["default"])
    bg_hex = theme_colors["bg"]
    W = prs.slide_width
    H = prs.slide_height

    # 按 zIndex 升序渲染
    elements = sorted(preset.get("elements", []), key=lambda e: e.get("zIndex", 0))

    TEXT_ALIGN_MAP = {
        "left": PP_ALIGN.LEFT,
        "center": PP_ALIGN.CENTER,
        "right": PP_ALIGN.RIGHT,
    }
    SHAPE_TYPE_MAP = {
        "rectangle": 1,
        "rounded-rect": 5,
        "circle": 9,
    }

    for el in elements:
        el_type = el.get("type")
        # 百分比位置转换为 EMU
        x = Emu(int(W * el["x"] / 100))
        y = Emu(int(H * el["y"] / 100))
        w = Emu(int(W * el["w"] / 100))
        h = Emu(int(H * el["h"] / 100))

        if el_type == "shape":
            shape_type_id = SHAPE_TYPE_MAP.get(el.get("shape", "rectangle"), 1)
            shape = pptx_slide.shapes.add_shape(shape_type_id, x, y, w, h)
            fill_hex = _resolve(el.get("fillColor", "#CCCCCC"), data, theme_colors)
            opacity = el.get("opacity", 1.0)
            if opacity < 1.0:
                color = _blend(fill_hex, bg_hex, opacity)
            else:
                r, g, b = _hex_to_rgb(fill_hex)
                color = RGBColor(r, g, b)
            shape.fill.solid()
            shape.fill.fore_color.rgb = color
            shape.line.fill.background()

        elif el_type == "text":
            content_tmpl = el.get("content", "")
            content = _resolve(content_tmpl, data, theme_colors)
            if not content:
                continue  # 跳过空内容文本框

            color_hex = _resolve(el.get("color", "#000000"), data, theme_colors)
            r, g, b = _hex_to_rgb(color_hex)
            text_color = RGBColor(r, g, b)

            bold = el.get("fontWeight") == "bold"
            font_size = el.get("fontSize", 16)
            align = TEXT_ALIGN_MAP.get(el.get("textAlign", "left"), PP_ALIGN.LEFT)

            _add_textbox(pptx_slide, content, x, y, w, h,
                         font_size=font_size, color=text_color,
                         bold=bold, align=align)

        elif el_type == "icon":
            # PPTX 中用 ● 等 Unicode 符号替代图标
            icon_name = _resolve(el.get("icon", ""), data, theme_colors)
            if not icon_name:
                continue
            color_hex = _resolve(el.get("color", "#3B82F6"), data, theme_colors)
            r, g, b = _hex_to_rgb(color_hex)
            icon_color = RGBColor(r, g, b)
            _add_textbox(pptx_slide, "●", x, y, w, h,
                         font_size=int(el.get("h", 8) * 2),
                         color=icon_color, bold=False, align=PP_ALIGN.CENTER)


def build_pptx(payload: PresentationPayload) -> io.BytesIO:
    """
    将 PresentationPayload 转换为 PPTX 二进制数据。
    返回 BytesIO 对象供路由层直接输出。
    """
    prs = Presentation()
    # 设置 16:9 比例
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    theme_colors = THEME_COLOR_HEX.get(payload.theme, THEME_COLOR_HEX["default"])
    bg_hex = theme_colors["bg"]
    bg_r, bg_g, bg_b = _hex_to_rgb(bg_hex)

    blank_layout = prs.slide_layouts[6]  # 空白布局

    for slide_payload in payload.slides:
        pptx_slide = prs.slides.add_slide(blank_layout)
        _set_bg(pptx_slide, RGBColor(bg_r, bg_g, bg_b))
        _build_preset_slide(prs, pptx_slide, slide_payload.layout.value, slide_payload.data, payload.theme)

    output = io.BytesIO()
    prs.save(output)
    output.seek(0)
    return output
