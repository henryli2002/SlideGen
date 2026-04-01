// ===== 核心数据契约 =====

export type LayoutType =
  | "cover_centered"
  | "cover_left_bold"
  | "closing_cta"
  | "section_divider"
  | "bullets_icon_list"
  | "bullets_card_grid"
  | "stats_three_column"
  | "timeline_horizontal"
  | "split_two_column"
  | "quote_centered";

export interface Presentation {
  schemaVersion: "1.0";
  theme: "default" | "dark" | "corporate";
  slides: Slide[];
}

export interface Slide {
  id: string;                        // uuid，前端生成
  layout: LayoutType;
  data: Record<string, string>;      // 平铺键值对，与 layout_presets JSON 中 {{variable}} 对应
}

// ===== SSE 事件负载 =====
export interface SSEEvent {
  status: "generating" | "done" | "error";
  slide?: Omit<Slide, "id">;         // 不含 id，由前端生成
  message?: string;                  // 仅 error 时有值
  progress?: {
    current: number;
    total: number;
  };
}
