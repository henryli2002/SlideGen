import type { Slide } from "../types/schema";
import { PresetSlide } from "./slides/PresetSlide";

interface Props {
  slide: Slide;
  theme: string;
  isThumbnail?: boolean;
}

// 所有布局统一通过 PresetSlide 渲染，isThumbnail 由缩放比例自动处理
export function SlideRenderer({ slide, theme }: Props) {
  return <PresetSlide layout={slide.layout} data={slide.data} theme={theme} />;
}
