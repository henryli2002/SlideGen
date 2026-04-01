import { useState, useEffect, useRef, useCallback } from "react";
import { useSSE } from "./hooks/useSSE";
import type { Presentation } from "./types/schema";
import { InputPanel } from "./components/InputPanel";
import FabricCanvas from "./components/FabricCanvas";
import type { FabricCanvasRef } from "./components/FabricCanvas";
import { SlideList } from "./components/SlideList";
import { EditForm } from "./components/EditForm";
import { ExportButton } from "./components/ExportButton";
import "./styles/slides.css";

const globalStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
    background: #f0f2f5;
    height: 100vh;
    overflow: hidden;
  }
  #root { height: 100vh; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;

type Theme = "default" | "dark" | "corporate";

export default function App() {
  const { slides, status, errorMessage, startGeneration, stopGeneration, updateSlide } = useSSE();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [theme, setTheme] = useState<Theme>("default");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const canvasRef = useRef<FabricCanvasRef>(null);
  const prevSlidesLenRef = useRef(0);
  const viewportRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number>(0);

  // 生成时自动跳到最新页
  useEffect(() => {
    if (slides.length > prevSlidesLenRef.current && status === "loading") {
      setCurrentIndex(slides.length - 1);
    }
    prevSlidesLenRef.current = slides.length;
  }, [slides.length, status]);

  // 过渡动画期间持续触发 canvas resize，实现平滑缩放
  const animateResize = useCallback(() => {
    canvasRef.current?.triggerResize();
    rafRef.current = requestAnimationFrame(animateResize);
  }, []);

  // 侧边栏切换时启动动画帧循环，过渡结束后停止
  useEffect(() => {
    // 启动 rAF 循环，持续触发 resize
    rafRef.current = requestAnimationFrame(animateResize);

    const viewport = viewportRef.current;
    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === "padding-right") {
        cancelAnimationFrame(rafRef.current);
        // 最终精确 resize
        canvasRef.current?.triggerResize();
      }
    };

    viewport?.addEventListener("transitionend", handleTransitionEnd);

    return () => {
      cancelAnimationFrame(rafRef.current);
      viewport?.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [isSidebarOpen, animateResize]);

  const currentSlide = slides[currentIndex] ?? null;

  const presentation: Presentation = {
    schemaVersion: "2.0",
    theme,
    slides,
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        {/* ===== 顶部导航栏 ===== */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 20px",
            height: 56,
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, color: "#3B82F6", whiteSpace: "nowrap" }}>
            SlideGen AI
          </div>
          <InputPanel
            status={status}
            onGenerate={startGeneration}
            onStop={stopGeneration}
          />
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
              color: "#374151",
              cursor: "pointer",
              background: "#fff",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <option value="default">默认主题</option>
            <option value="dark">深色主题</option>
            <option value="corporate">商务主题</option>
          </select>
        </header>

        {/* ===== 主工作区 ===== */}
        <main
          className="workspace"
          style={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* 左侧缩略图列表 */}
          <aside
            style={{
              width: 160,
              background: "#f8fafc",
              borderRight: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: "10px 8px 6px",
                fontSize: 12,
                fontWeight: 600,
                color: "#9ca3af",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0,
              }}
            >
              共 {slides.length} 页
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <SlideList
                slides={slides}
                currentIndex={currentIndex}
                theme={theme}
                onSelect={setCurrentIndex}
              />
            </div>
          </aside>

          {/* ===== 中央视口区域（桌面 + 纸张） ===== */}
          <section
            ref={viewportRef}
            className={`canvas-viewport${isSidebarOpen ? " sidebar-open" : ""}`}
          >
            {/* 生成中指示器 */}
            {status === "loading" && (
              <div className="loading-indicator">
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                AI 正在生成中...
              </div>
            )}

            {/* 错误指示器 */}
            {status === "error" && (
              <div className="error-indicator">
                {errorMessage || "发生错误，请重试"}
              </div>
            )}

            {/* 白色纸张 —— Fabric.js 画布的物理边界 */}
            <div className="slide-paper">
              <FabricCanvas ref={canvasRef} slide={currentSlide} theme={theme} />
            </div>

            {/* 底部页码导航 */}
            {slides.length > 0 && (
              <div className="slide-nav-bar">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  style={navBtnStyle(currentIndex === 0)}
                >
                  ‹
                </button>
                <span style={{ fontSize: 13, color: "#6b7280", minWidth: 60, textAlign: "center" }}>
                  {currentIndex + 1} / {slides.length}
                </span>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(slides.length - 1, i + 1))}
                  disabled={currentIndex === slides.length - 1}
                  style={navBtnStyle(currentIndex === slides.length - 1)}
                >
                  ›
                </button>
              </div>
            )}
          </section>

          {/* ===== 抽屉触发器 ===== */}
          <div
            className={`drawer-trigger${isSidebarOpen ? " open" : ""}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ right: isSidebarOpen ? 320 : 0 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>

          {/* ===== 右侧编辑抽屉 ===== */}
          <aside className={`edit-drawer${isSidebarOpen ? "" : " closed"}`}>
            <div
              style={{
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>编辑内容</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#9ca3af",
                  padding: "2px 4px",
                  borderRadius: 4,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <EditForm
                slide={currentSlide}
                onUpdate={updateSlide}
              />
            </div>
          </aside>
        </main>

        {/* ===== 底部工具栏 ===== */}
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            height: 48,
            background: "#ffffff",
            borderTop: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            {slides.length > 0
              ? `共 ${slides.length} 页幻灯片${status === "done" ? "，生成完成" : ""}`
              : "准备就绪"}
          </span>
          <ExportButton
            presentation={presentation}
            disabled={status === "loading" || slides.length === 0}
          />
        </footer>
      </div>
    </>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid #e5e7eb",
    background: disabled ? "#f9fafb" : "#ffffff",
    color: disabled ? "#d1d5db" : "#374151",
    fontSize: 16,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}