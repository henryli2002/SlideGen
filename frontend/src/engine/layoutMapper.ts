/**
 * layoutMapper.ts — 语义预设 → Fabric.js 对象 转换器
 *
 * 唯一真相源：presets/index.ts（百分比坐标 0-100）
 * 本模块负责将百分比坐标转换为 Fabric.js 所需的绝对像素坐标。
 *
 * 坐标约定：
 *  - 预设中 x/y/w/h 均为百分比（相对画布宽/高）
 *  - 转换后 left/top 为像素，代表元素**左上角**位置
 *  - Fabric 对象统一使用 originX: "left", originY: "top"
 */

import type { Slide } from "../types/schema";
import { PRESETS, THEME_COLORS as PRESET_THEME_COLORS, type PresetElement } from "../presets/index";

// 逻辑画布尺寸（Fabric.js 内部坐标系）
export const LOGIC_WIDTH = 1280;
export const LOGIC_HEIGHT = 720;

// 主题颜色配置 — 与 presets/index.ts 对齐，增加 bg 字段供 FabricCanvas 使用
export interface ThemeColors {
  bg: string;
  accentColor: string;
  titleColor: string;
  bodyColor: string;
}

export const THEME_COLORS: Record<string, ThemeColors> = {
  default: { bg: "#FFFFFF", accentColor: "#3B82F6", titleColor: "#1F2937", bodyColor: "#374151" },
  dark: { bg: "#1E293B", accentColor: "#60A5FA", titleColor: "#F1F5F9", bodyColor: "#CBD5E1" },
  corporate: { bg: "#F8FAFC", accentColor: "#1D4ED8", titleColor: "#0F172A", bodyColor: "#374151" },
};

// Fabric 对象的中间表示
export interface FabricObjectDesc {
  type: "rect" | "textbox";
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  rx?: number;
  ry?: number;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: string;
  text?: string;
  splitByGrapheme?: boolean;
  selectable: boolean;
  evented: boolean;
  zIndex: number;
  originX: "left";
  originY: "top";
}

/**
 * 将一张幻灯片的语义数据转换为 Fabric.js 可直接使用的对象描述数组
 */
export function semanticToFabricObjects(slide: Slide, theme: string): FabricObjectDesc[] {
  const colors = THEME_COLORS[theme] || THEME_COLORS.default;
  const presetColors = PRESET_THEME_COLORS[theme] || PRESET_THEME_COLORS.default;
  const preset = PRESETS[slide.layout];
  if (!preset) return [];

  const results: FabricObjectDesc[] = [];
  const sorted = [...preset.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  for (const el of sorted) {
    const obj = convertElement(el, slide.data, presetColors, colors);
    if (obj) results.push(obj);
  }

  return results;
}

/**
 * 将单个预设元素转换为 Fabric 对象描述
 */
function convertElement(
  el: PresetElement,
  data: Record<string, string>,
  presetColors: Record<string, string>,
  themeColors: ThemeColors,
): FabricObjectDesc | null {
  // 百分比 → 像素
  const left = (el.x / 100) * LOGIC_WIDTH;
  const top = (el.y / 100) * LOGIC_HEIGHT;
  const width = (el.w / 100) * LOGIC_WIDTH;
  const height = (el.h / 100) * LOGIC_HEIGHT;
  const zIndex = el.zIndex ?? 0;

  const base = {
    left,
    top,
    width,
    height,
    selectable: true,
    evented: true,
    zIndex,
    originX: "left" as const,
    originY: "top" as const,
  };

  if (el.type === "shape") {
    const rawColor = resolve(el.fillColor ?? "#CCCCCC", data, presetColors);
    const opacity = el.opacity ?? 1;
    const fill = opacity < 1
      ? blendToRgb(rawColor, themeColors.bg, opacity)
      : rawColor;

    const borderRadius = el.borderRadius ?? 0;
    const radius = el.shape === "circle"
      ? Math.min(width, height) / 2
      : borderRadius;

    return {
      ...base,
      type: "rect",
      fill,
      rx: radius,
      ry: radius,
    };
  }

  if (el.type === "text") {
    const content = resolve(el.content ?? "", data, presetColors);
    if (!content) return null;

    const textColor = resolve(el.color ?? "#000000", data, presetColors);
    const opacity = el.opacity;
    const fill = opacity !== undefined && opacity < 1
      ? blendToRgb(textColor, themeColors.bg, opacity)
      : textColor;

    return {
      ...base,
      type: "textbox",
      text: content,
      fill,
      fontSize: el.fontSize ?? 16,
      fontWeight: el.fontWeight === "bold" ? "bold" : "normal",
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      textAlign: el.textAlign ?? "left",
      splitByGrapheme: true,
    };
  }

  if (el.type === "icon") {
    // 图标渲染为 ● 文字符号
    const iconName = resolve(el.icon ?? "", data, presetColors);
    if (!iconName) return null;

    const iconColor = resolve(el.color ?? "#3B82F6", data, presetColors);
    const iconSize = height * 0.6;

    return {
      ...base,
      type: "textbox",
      text: "●",
      fill: iconColor,
      fontSize: iconSize,
      fontWeight: "normal",
      fontFamily: "Arial, sans-serif",
      textAlign: "center",
      splitByGrapheme: false,
    };
  }

  return null;
}

// ===== 工具函数 =====

/** 替换 {{variable}} 模板变量 */
function resolve(tmpl: string, data: Record<string, string>, colors: Record<string, string>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? colors[k] ?? "");
}

/** 十六进制 → RGB 元组 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** 将前景色以 opacity 混合到背景色上，返回 rgb() 字符串 */
function blendToRgb(fgHex: string, bgHex: string, opacity: number): string {
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);
  const r = Math.round(br * (1 - opacity) + fr * opacity);
  const g = Math.round(bg * (1 - opacity) + fg * opacity);
  const b = Math.round(bb * (1 - opacity) + fb * opacity);
  return `rgb(${r},${g},${b})`;
}