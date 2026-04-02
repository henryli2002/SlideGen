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
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", -apple-system, sans-serif;
    background: #f0f4f8;
    height: 100vh;
    overflow: hidden;
    color: #0f172a;
  }
  #root { height: 100vh; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;

type Theme = "default" | "dark" | "corporate";

export default function App() {
  const { slides, status, errorMessage, startGeneration, stopGeneration, updateSlide } = useSSE();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [theme, setTheme] = useState<Theme>("default");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // 换页时短暂淡出纸张，营造丝滑切换感
  const [isTransitioning, setIsTransitioning] = useState(false);
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

  // 过渡动画期间持续触发 canvas resize，确保 Fabric.js 平滑缩放
  const animateResize = useCallback(() => {
    canvasRef.current?.triggerResize();
    rafRef.current = requestAnimationFrame(animateResize);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateResize);
    const viewport = viewportRef.current;
    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === "padding-right") {
        cancelAnimationFrame(rafRef.current);
        canvasRef.current?.triggerResize();
      }
    };
    viewport?.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      cancelAnimationFrame(rafRef.current);
      viewport?.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [isSidebarOpen, animateResize]);

  // 切换页面时触发纸张淡出→淡入
  const handleSelectSlide = useCallback((index: number) => {
    if (index === currentIndex) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 120);
  }, [currentIndex]);

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
        <header style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 20px",
          height: 56,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
          zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{
            fontWeight: 800,
            fontSize: 17,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            whiteSpace: "nowrap",
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}>
            SlideGen AI
          </div>

          <InputPanel status={status} onGenerate={startGeneration} onStop={stopGeneration} />

          {/* 主题选择器 */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            className="theme-select"
          >
            <option value="default">默认主题</option>
            <option value="dark">深色主题</option>
            <option value="corporate">商务主题</option>
          </select>
        </header>

        {/* ===== 主工作区 ===== */}
        <main style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}>

          {/* ===== 左侧缩略图列表 ===== */}
          <aside style={{
            width: 160,
            background: "#f8fafc",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}>
            {/* 页数标题 */}
            <div style={{
              padding: "9px 10px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#94a3b8",
              borderBottom: "1px solid #e2e8f0",
              flexShrink: 0,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              共 {slides.length} 页
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <SlideList
                slides={slides}
                currentIndex={currentIndex}
                theme={theme}
                onSelect={handleSelectSlide}
              />
            </div>
          </aside>

          {/* ===== 中央视口（桌面 + 纸张） ===== */}
          <section
            ref={viewportRef}
            className={`canvas-viewport${isSidebarOpen ? " sidebar-open" : ""}`}
          >
            {/* 生成中指示器 */}
            {status === "loading" && (
              <div className="loading-indicator">
                <div className="loading-dots">
                  <span /><span /><span />
                </div>
                AI 正在生成中
              </div>
            )}

            {/* 错误指示器 */}
            {status === "error" && (
              <div className="error-indicator">
                ⚠ {errorMessage || "发生错误，请重试"}
              </div>
            )}

            {/* 白色纸张 —— Fabric.js 画布的物理边界 */}
            <div className={`slide-paper${isTransitioning ? " transitioning" : ""}`}>
              <FabricCanvas ref={canvasRef} slide={currentSlide} theme={theme} />
            </div>

            {/* 底部页码导航（玻璃态胶囊） */}
            {slides.length > 0 && (
              <div className="slide-nav-bar">
                <button
                  className="nav-btn"
                  onClick={() => handleSelectSlide(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  ‹
                </button>
                <span className="nav-label">
                  {currentIndex + 1} / {slides.length}
                </span>
                <button
                  className="nav-btn"
                  onClick={() => handleSelectSlide(Math.min(slides.length - 1, currentIndex + 1))}
                  disabled={currentIndex === slides.length - 1}
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
            <div style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
              borderBottom: "1px solid #e2e8f0",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              letterSpacing: "-0.01em",
            }}>
              <span>编辑内容</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="btn btn-ghost"
                style={{ padding: "3px 6px", fontSize: 14, borderRadius: 6 }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <EditForm slide={currentSlide} onUpdate={updateSlide} />
            </div>
          </aside>
        </main>

        {/* ===== 底部工具栏 ===== */}
        <footer style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 48,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #e2e8f0",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12.5, color: "#94a3b8", fontWeight: 500 }}>
            {slides.length > 0
              ? `共 ${slides.length} 页幻灯片${status === "done" ? " · 生成完成" : ""}`
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
