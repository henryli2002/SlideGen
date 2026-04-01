/**
 * pptxExport.ts — 前端 PPTX 导出服务
 *
 * 唯一真相源：presets/index.ts（百分比坐标 0-100）
 *
 * 关键设计决策：
 *  1. 使用 PptxGenJS 原生百分比字符串定位（如 '50%'），避免手动英寸换算误差
 *  2. LAYOUT_16x9 = 10" × 5.625"（720pt × 405pt）
 *  3. 预设 fontSize 基于 960×540 虚拟画布（CSS px），需按比例缩放到 PPTX pt
 *     缩放因子 = 5.625" × 72pt/inch / 540 virtual px = 0.75
 *  4. 显式设置 margin: 0 消除 PPTX 文本框默认内边距
 */

import PptxGenJS from "pptxgenjs";
import type { Presentation } from "../types/schema";
import { PRESETS, THEME_COLORS, type PresetElement } from "../presets/index";

// LAYOUT_16x9 真实尺寸（英寸）
const PPTX_WIDTH_INCH = 10;
const PPTX_HEIGHT_INCH = 5.625;

// 虚拟画布 → PPTX 字号缩放因子
// PresetSlide 虚拟尺寸 540px 对应 PPTX 5.625" = 405pt
// 缩放 = 405 / 540 = 0.75
const FONT_SCALE = (PPTX_HEIGHT_INCH * 72) / 540;

// 统一字体
const FONT_FACE = "Microsoft YaHei";

/**
 * 替换 {{variable}} 模板变量
 */
function resolve(tmpl: string, data: Record<string, string>, colors: Record<string, string>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? colors[k] ?? "");
}

/**
 * 十六进制颜色去除 # 前缀（PptxGenJS 要求纯 hex 字符串）
 */
function toHex6(hex: string): string {
  return hex.replace("#", "");
}

/**
 * 百分比数值 → PptxGenJS 百分比字符串
 * 例如: 50 → '50%'
 */
function pct(value: number): string {
  return `${value}%`;
}

/**
 * 导出演示文稿为 PPTX 并触发下载
 */
export async function downloadPPTX(presentation: Presentation, filename: string = "presentation.pptx") {
  const themeColors = THEME_COLORS[presentation.theme] || THEME_COLORS.default;
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_16x9";
  pptx.author = "SlideGen AI";
  pptx.title = "AI Generated Presentation";

  for (const slide of presentation.slides) {
    const pptxSlide = pptx.addSlide();
    pptxSlide.background = { color: toHex6(themeColors.bgColor) };

    const preset = PRESETS[slide.layout];
    if (!preset) continue;

    const sorted = [...preset.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    for (const el of sorted) {
      renderElement(pptx, pptxSlide, el, slide.data, themeColors);
    }
  }

  const result = await pptx.write({ outputType: "blob" });
  const blob = result as Blob;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 将单个预设元素渲染到 PPTX 幻灯片上
 */
function renderElement(
  pptx: PptxGenJS,
  pptxSlide: PptxGenJS.Slide,
  el: PresetElement,
  data: Record<string, string>,
  colors: Record<string, string>,
): void {
  // 直接使用百分比字符串定位 — 由 PptxGenJS 内部处理英寸转换
  const x = pct(el.x);
  const y = pct(el.y);
  const w = pct(el.w);
  const h = pct(el.h);

  if (el.type === "shape") {
    const rawColor = resolve(el.fillColor ?? "#CCCCCC", data, colors);
    const opacity = el.opacity ?? 1;
    const transparency = Math.round((1 - opacity) * 100);

    const isRounded = el.shape === "rounded-rect" || (el.borderRadius && el.borderRadius > 0);
    const shapeType = isRounded ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;

    pptxSlide.addShape(shapeType, {
      x, y, w, h,
      fill: { color: toHex6(rawColor), transparency },
      line: { color: "none" as unknown as string, width: 0 },
      rectRadius: isRounded ? (el.borderRadius ?? 8) / 100 : undefined,
    });
  }

  if (el.type === "text") {
    const content = resolve(el.content ?? "", data, colors);
    if (!content) return;

    const rawColor = resolve(el.color ?? "#000000", data, colors);
    const rawFontSize = el.fontSize ?? 16;
    // CSS px → PPTX pt：缩放 0.75
    const fontSize = Math.round(rawFontSize * FONT_SCALE);
    const isBold = el.fontWeight === "bold";
    const align = (el.textAlign ?? "left") as "left" | "center" | "right";

    // verticalAlign 映射
    const valign = el.verticalAlign === "middle" ? "middle"
      : el.verticalAlign === "bottom" ? "bottom"
      : "top";

    pptxSlide.addText(content, {
      x, y, w, h,
      fontSize,
      fontFace: FONT_FACE,
      color: toHex6(rawColor),
      bold: isBold,
      align,
      valign,
      isTextBox: true,
      margin: 0,
      wrap: true,
      lineSpacingMultiple: el.lineHeight ?? 1.2,
    });
  }

  if (el.type === "icon") {
    const iconName = resolve(el.icon ?? "", data, colors);
    if (!iconName) return;

    const iconColor = resolve(el.color ?? "#3B82F6", data, colors);
    // 图标大小：容器高度（英寸）× 72 → pt, 再 × 0.5 缩小
    const hInch = (el.h / 100) * PPTX_HEIGHT_INCH;
    const iconSize = Math.round(hInch * 72 * 0.5);

    pptxSlide.addText("●", {
      x, y, w, h,
      fontSize: iconSize,
      fontFace: "Arial",
      color: toHex6(iconColor),
      align: "center",
      valign: "middle",
      isTextBox: true,
      margin: 0,
    });
  }
}