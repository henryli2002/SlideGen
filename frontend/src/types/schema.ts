// ===== 核心数据契约 =====

export interface Presentation {
  schemaVersion: "1.0";
  theme: "default" | "dark" | "corporate";
  slides: Slide[];
}

export interface Slide {
  id: string;                      // uuid，前端生成
  layout: "cover" | "bullets" | "split";
  data: CoverData | BulletsData | SplitData;
}

// --- 各 Layout 的数据结构 ---
export interface CoverData {
  title: string;                   // 最多 30 字
  subtitle: string;                // 最多 60 字
}

export interface BulletsData {
  title: string;                   // 最多 30 字
  bullets: string[];               // 3~6 条，每条最多 40 字
}

export interface SplitData {
  title: string;                   // 最多 30 字
  leftContent: string;             // 最多 120 字
  rightContent: string;            // 最多 120 字
}

// ===== SSE 事件负载 =====
export interface SSEEvent {
  status: "generating" | "done" | "error";
  slide?: Omit<Slide, "id">;      // 不含 id，由前端生成
  message?: string;                // 仅 error 时有值
  progress?: {                     // 可选：进度信息
    current: number;
    total: number;
  };
}
