import { useRef, useEffect, useState, type ComponentType } from "react";
import {
  Check, Star, Zap, Target, Shield, Users, BarChart2,
  BookOpen, Lightbulb, Globe, Clock, ArrowRight,
  TrendingUp, Award, Cpu, Database, CheckCircle,
} from "lucide-react";
import type { LayoutType } from "../../types/schema";
import { PRESETS, THEME_COLORS, type PresetElement } from "../../presets/index";

// ===== 图标名称 → Lucide 组件映射 =====
type IconComp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const ICON_MAP: Record<string, IconComp> = {
  "check": Check,
  "check-circle": CheckCircle,
  "star": Star,
  "zap": Zap,
  "target": Target,
  "shield": Shield,
  "users": Users,
  "chart-bar": BarChart2,
  "book-open": BookOpen,
  "lightbulb": Lightbulb,
  "globe": Globe,
  "clock": Clock,
  "arrow-right": ArrowRight,
  "trending-up": TrendingUp,
  "award": Award,
  "cpu": Cpu,
  "database": Database,
};

interface Props {
  layout: LayoutType;
  data: Record<string, string>;
  theme: string;
}

// 虚拟画布尺寸（预设坐标与字号均基于此参照系，通过 CSS transform 缩放到实际尺寸）
const VIRTUAL_W = 960;
const VIRTUAL_H = 540;

// 解析 {{variable}} 模板变量
function resolve(tmpl: string, data: Record<string, string>, tc: Record<string, string>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? tc[k] ?? "");
}

// 将前景色以 opacity 混合到背景色上（模拟 CSS rgba 效果）
function blend(fg: string, bg: string, opacity: number): string {
  const rgb = (h: string) => {
    const v = h.replace("#", "");
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  };
  const [fr, fg2, fb] = rgb(fg);
  const [br, bg2, bb] = rgb(bg);
  return `rgb(${Math.round(br * (1 - opacity) + fr * opacity)},${Math.round(bg2 * (1 - opacity) + fg2 * opacity)},${Math.round(bb * (1 - opacity) + fb * opacity)})`;
}

// 渲染单个预设元素（坐标单位：px，基于 VIRTUAL_W/H 参照系）
function renderEl(
  el: PresetElement,
  data: Record<string, string>,
  tc: Record<string, string>, // theme colors
  bgColor: string,
  key: string,
): React.ReactNode {
  const style: React.CSSProperties = {
    position: "absolute",
    left: el.x / 100 * VIRTUAL_W,
    top: el.y / 100 * VIRTUAL_H,
    width: el.w / 100 * VIRTUAL_W,
    height: el.h / 100 * VIRTUAL_H,
    zIndex: el.zIndex ?? 0,
    overflow: "hidden",
  };

  if (el.type === "shape") {
    const rawColor = resolve(el.fillColor ?? "#cccccc", data, tc);
    const opacity = el.opacity ?? 1;
    const color = opacity < 1 ? blend(rawColor, bgColor, opacity) : rawColor;
    const br =
      el.shape === "circle"
        ? "50%"
        : el.shape === "rounded-rect"
        ? `${el.borderRadius ?? 8}px`
        : "0";
    return <div key={key} style={{ ...style, background: color, borderRadius: br }} />;
  }

  if (el.type === "text") {
    const content = resolve(el.content ?? "", data, tc);
    if (!content) return null;

    const rawColor = resolve(el.color ?? "#000000", data, tc);
    const opacity = el.opacity;
    const color = opacity !== undefined && opacity < 1 ? blend(rawColor, bgColor, opacity) : rawColor;
    const va = el.verticalAlign ?? "top";
    const alignItems = va === "middle" ? "center" : va === "bottom" ? "flex-end" : "flex-start";

    return (
      <div
        key={key}
        style={{
          ...style,
          display: "flex",
          alignItems,
          fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
          fontSize: el.fontSize ?? 16,
          fontWeight: el.fontWeight === "bold" ? 700 : 400,
          color,
          textAlign: el.textAlign ?? "left",
          lineHeight: el.lineHeight ?? 1.4,
        }}
      >
        <span
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 10,
            overflow: "hidden",
            wordBreak: "break-all",
            width: "100%",
          }}
        >
          {content}
        </span>
      </div>
    );
  }

  if (el.type === "icon") {
    const iconName = resolve(el.icon ?? "", data, tc).trim();
    if (!iconName) return null;
    const Icon = ICON_MAP[iconName] ?? CheckCircle;
    const rawColor = resolve(el.color ?? "#3B82F6", data, tc);
    const iconPx = el.h / 100 * VIRTUAL_H * 0.6;
    return (
      <div key={key} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={iconPx} color={rawColor} strokeWidth={2} />
      </div>
    );
  }

  return null;
}

// ===== 主组件 =====
export function PresetSlide({ layout, data, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // ResizeObserver 监听容器宽度，计算缩放比例
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (w: number) => setScale(w / VIRTUAL_W);
    const obs = new ResizeObserver(([e]) => update(e.contentRect.width));
    obs.observe(el);
    update(el.getBoundingClientRect().width || VIRTUAL_W);
    return () => obs.disconnect();
  }, []);

  const preset = PRESETS[layout];
  // 诊断日志，确认运行时收到的值（稳定后可删除）
  console.log('[PresetSlide] layout=', layout, ' preset=', !!preset, ' PRESETS keys=', Object.keys(PRESETS));
  if (!preset) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 13 }}>
        未知布局：{layout}
      </div>
    );
  }

  const tc = THEME_COLORS[theme] ?? THEME_COLORS.default;
  const bgColor = tc.bgColor;
  const sorted = [...preset.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    // 外层负责撑满父容器并裁剪溢出内容
    <div ref={containerRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* 内层始终为 VIRTUAL_W×VIRTUAL_H，通过 scale 缩放适配容器 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: VIRTUAL_W,
          height: VIRTUAL_H,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
        }}
      >
        {sorted.map((el, i) => renderEl(el, data, tc, bgColor, `${el.role}-${i}`))}
      </div>
    </div>
  );
}
