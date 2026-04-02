/**
 * FabricCanvas.tsx — Fabric.js 画布组件
 *
 * 负责将 layoutMapper 输出的 FabricObjectDesc 渲染为真实的 Fabric 对象。
 * 所有对象均使用 originX: "left", originY: "top" 坐标系。
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as fabric from "fabric";
import type { Slide } from "../types/schema";
import { semanticToFabricObjects, THEME_COLORS, LOGIC_WIDTH, LOGIC_HEIGHT } from "../engine/layoutMapper";
import type { FabricObjectDesc } from "../engine/layoutMapper";

export interface FabricCanvasRef {
  getCanvas: () => fabric.Canvas | null;
  exportToJSON: () => ReturnType<fabric.Canvas["toJSON"]> | undefined;
  loadFromJSON: (json: string) => void;
  triggerResize: () => void;
}

interface FabricCanvasProps {
  slide: Slide | null;
  theme: "default" | "dark" | "corporate";
}

const FabricCanvas = forwardRef<FabricCanvasRef, FabricCanvasProps>(
  ({ slide, theme }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const isRendering = useRef(false);

    useImperativeHandle(ref, () => ({
      getCanvas: () => fabricRef.current,
      exportToJSON: () => fabricRef.current?.toJSON(),
      loadFromJSON: (json: string) => {
        fabricRef.current?.loadFromJSON(json);
      },
      triggerResize: () => updateZoom(),
    }));

    // 根据容器尺寸计算缩放比例，让逻辑画布适配显示区域
    const updateZoom = () => {
      if (!containerRef.current || !fabricRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const scaleX = containerWidth / LOGIC_WIDTH;
      const scaleY = containerHeight / LOGIC_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      fabricRef.current.setZoom(scale);
      fabricRef.current.setDimensions({
        width: LOGIC_WIDTH * scale,
        height: LOGIC_HEIGHT * scale,
      });
      fabricRef.current.renderAll();
    };

    // 初始化 Fabric Canvas
    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const colors = THEME_COLORS[theme] || THEME_COLORS.default;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: LOGIC_WIDTH,
        height: LOGIC_HEIGHT,
        backgroundColor: colors.bg,
        selection: true,
        preserveObjectStacking: true,
      });

      fabricRef.current = canvas;

      const resizeObserver = new ResizeObserver(() => {
        updateZoom();
      });
      resizeObserver.observe(containerRef.current);

      setTimeout(updateZoom, 0);

      return () => {
        resizeObserver.disconnect();
        canvas.dispose();
      };
    }, []);

    // 主题变更时更新背景色（不清除对象，仅刷新背景）
    // slide+theme 联合 effect 会负责重新渲染所有对象
    useEffect(() => {
      if (!fabricRef.current) return;
      const colors = THEME_COLORS[theme] || THEME_COLORS.default;
      fabricRef.current.backgroundColor = colors.bg;
      fabricRef.current.renderAll();
    }, [theme]);

    // 幻灯片数据变更时重新渲染所有对象
    useEffect(() => {
      if (!fabricRef.current || !slide || isRendering.current) return;

      isRendering.current = true;
      const canvas = fabricRef.current;
      const colors = THEME_COLORS[theme] || THEME_COLORS.default;

      // 注意：Fabric.js v6 的 canvas.clear() 会将 backgroundColor 重置为 ''
      // 因此必须在 clear() 之后才能设置背景色
      canvas.clear();
      canvas.backgroundColor = colors.bg;

      const objects = semanticToFabricObjects(slide, theme);

      for (const obj of objects) {
        const fabricObj = createFabricObject(obj);
        if (fabricObj) {
          canvas.add(fabricObj);
        }
      }

      canvas.renderAll();
      isRendering.current = false;
    }, [slide, theme]);

    return (
      <div
        ref={containerRef}
        className="fabric-canvas-container"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
          }}
        />
      </div>
    );
  }
);

/**
 * 根据 FabricObjectDesc 创建真实的 Fabric 对象
 * 统一使用 originX: "left", originY: "top"
 */
function createFabricObject(desc: FabricObjectDesc): fabric.FabricObject | null {
  if (desc.type === "rect") {
    return new fabric.Rect({
      left: desc.left,
      top: desc.top,
      width: desc.width,
      height: desc.height,
      fill: desc.fill,
      rx: desc.rx || 0,
      ry: desc.ry || 0,
      originX: "left",
      originY: "top",
      selectable: desc.selectable,
      evented: desc.evented,
    });
  }

  if (desc.type === "textbox") {
    return new fabric.Textbox(desc.text || "", {
      left: desc.left,
      top: desc.top,
      width: desc.width,
      fontSize: desc.fontSize,
      fontWeight: desc.fontWeight as string,
      fill: desc.fill,
      textAlign: (desc.textAlign || "left") as "left" | "center" | "right" | "justify",
      fontFamily: desc.fontFamily || "Arial, sans-serif",
      originX: "left",
      originY: "top",
      splitByGrapheme: desc.splitByGrapheme ?? true,
      selectable: desc.selectable,
      evented: desc.evented,
    });
  }

  return null;
}

FabricCanvas.displayName = "FabricCanvas";

export default FabricCanvas;