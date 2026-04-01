import type { Slide, CoverData, BulletsData, SplitData } from "../types/schema";
import { CoverSlide } from "./slides/CoverSlide";
import { BulletsSlide } from "./slides/BulletsSlide";
import { SplitSlide } from "./slides/SplitSlide";

interface Props {
  slide: Slide;
  theme: string;
  isThumbnail?: boolean;
}

// 根据 layout 分发渲染，防御性：未知 layout 不崩溃
export function SlideRenderer({ slide, theme, isThumbnail }: Props) {
  switch (slide.layout) {
    case "cover":
      return <CoverSlide data={slide.data as CoverData} theme={theme} isThumbnail={isThumbnail} />;
    case "bullets":
      return <BulletsSlide data={slide.data as BulletsData} theme={theme} isThumbnail={isThumbnail} />;
    case "split":
      return <SplitSlide data={slide.data as SplitData} theme={theme} isThumbnail={isThumbnail} />;
    default:
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#999",
            fontSize: 14,
          }}
        >
          未知布局类型：{(slide as Slide).layout}
        </div>
      );
  }
}
