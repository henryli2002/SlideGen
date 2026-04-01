import { useState, useEffect, useRef } from "react";
import { useSSE } from "./hooks/useSSE";
import type { Presentation } from "./types/schema";
import { InputPanel } from "./components/InputPanel";
import { SlideCanvas } from "./components/SlideCanvas";
import { SlideList } from "./components/SlideList";
import { EditForm } from "./components/EditForm";
import { ExportButton } from "./components/ExportButton";
import "./styles/slides.css";

// 全局基础样式重置
const globalStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
    background: #f1f5f9;
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
  const prevSlidesLenRef = useRef(0);

  // 生成过程中，自动跳转到最新页
  useEffect(() => {
    if (slides.length > prevSlidesLenRef.current && status === "loading") {
      setCurrentIndex(slides.length - 1);
    }
    prevSlidesLenRef.current = slides.length;
  }, [slides.length, status]);

  // 当前幻灯片
  const currentSlide = slides[currentIndex] ?? null;

  // 组装完整 Presentation 对象（用于导出）
  const presentation: Presentation = {
    schemaVersion: "1.0",
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
          {/* Logo */}
          <div style={{ fontWeight: 700, fontSize: 18, color: "#3B82F6", whiteSpace: "nowrap" }}>
            SlideGen AI
          </div>

          {/* 主题输入 + 按钮 */}
          <InputPanel
            status={status}
            onGenerate={startGeneration}
            onStop={stopGeneration}
          />

          {/* 主题选择 */}
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

        {/* ===== 主体三栏布局 ===== */}
        <main
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "160px 1fr 260px",
            gridTemplateRows: "1fr",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* 左：缩略图列表 */}
          <aside
            style={{
              background: "#f8fafc",
              borderRight: "1px solid #e5e7eb",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
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

          {/* 中：主画布 */}
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              gap: 16,
              overflow: "hidden",
              background: "#f1f5f9",
            }}
          >
            {/* 生成中加载提示 */}
            {status === "loading" && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#3B82F6",
                  color: "#fff",
                  padding: "6px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  zIndex: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 2px 8px rgba(59,130,246,0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                AI 正在生成中...
              </div>
            )}

            {/* 错误提示 */}
            {status === "error" && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#ef4444",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  width: "100%",
                  maxWidth: 640,
                  flexShrink: 0,
                }}
              >
                {errorMessage || "发生错误，请重试"}
              </div>
            )}

            {/* 幻灯片画布 */}
            <div style={{ width: "100%", maxWidth: 800 }}>
              <SlideCanvas slide={currentSlide} theme={theme} />
            </div>

            {/* 页码导航 */}
            {slides.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  style={navBtnStyle(currentIndex === 0)}
                >
                  ‹ 上一页
                </button>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {currentIndex + 1} / {slides.length}
                </span>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(slides.length - 1, i + 1))}
                  disabled={currentIndex === slides.length - 1}
                  style={navBtnStyle(currentIndex === slides.length - 1)}
                >
                  下一页 ›
                </button>
              </div>
            )}
          </section>

          {/* 右：编辑表单 */}
          <aside
            style={{
              background: "#ffffff",
              borderLeft: "1px solid #e5e7eb",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0,
              }}
            >
              编辑内容
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    background: disabled ? "#f9fafb" : "#ffffff",
    color: disabled ? "#d1d5db" : "#374151",
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}
