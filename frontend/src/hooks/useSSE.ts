import { useState, useRef } from "react";
import type { Slide, SSEEvent } from "../types/schema";

// SSE 连接状态类型
export type SSEStatus = "idle" | "loading" | "done" | "error";

export function useSSE() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [status, setStatus] = useState<SSEStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // 开始生成幻灯片
  const startGeneration = async (topic: string, numSlides: number = 6) => {
    // 重置状态
    setSlides([]);
    setStatus("loading");
    setErrorMessage("");
    abortRef.current = new AbortController();

    try {
      const url = `/api/generate_stream?topic=${encodeURIComponent(topic)}&num_slides=${numSlides}`;
      const response = await fetch(url, {
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP 错误：${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解码并拼接到 buffer
        buffer += decoder.decode(value, { stream: true });

        // 按换行符拆分，处理完整的 SSE 行
        const lines = buffer.split("\n");
        // 最后一个可能不完整，保留到下次
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const payload: SSEEvent = JSON.parse(line.slice(6));

            if (payload.status === "generating" && payload.slide) {
              // 生成新幻灯片，添加前端生成的 id
              const newSlide: Slide = {
                id: crypto.randomUUID(),
                layout: payload.slide.layout,
                data: payload.slide.data,
              };
              setSlides((prev) => [...prev, newSlide]);
            } else if (payload.status === "done") {
              setStatus("done");
            } else if (payload.status === "error") {
              setStatus("error");
              setErrorMessage(payload.message || "生成失败，请重试");
            }
          } catch (parseError) {
            console.warn("SSE 事件解析失败：", line, parseError);
          }
        }
      }
    } catch (e) {
      const error = e as Error;
      // AbortError 是用户主动停止，不算异常
      if (error.name !== "AbortError") {
        setStatus("error");
        setErrorMessage(error.message || "连接失败，请检查网络");
      }
    }
  };

  // 停止生成
  const stopGeneration = () => {
    abortRef.current?.abort();
    setStatus("done");
  };

  // 更新某一页的数据
  const updateSlide = (slideId: string, newData: Slide["data"]) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, data: newData } : s))
    );
  };

  return {
    slides,
    setSlides,
    status,
    errorMessage,
    startGeneration,
    stopGeneration,
    updateSlide,
  };
}
