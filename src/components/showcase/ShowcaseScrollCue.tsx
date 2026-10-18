import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface ScrollMetrics {
  scrollHeight: number;
  innerHeight: number;
  scrollY: number;
}

/**
 * The strip is exactly as tall as the negative margin that cancels it, so the
 * cue paints inside the showcase's existing bottom gap and the carousel box
 * itself never grows.
 */
export const SCROLL_CUE_STRIP_PX = 24;

/** True while there is genuinely more page left below the current position. */
export function hasMoreBelow({ scrollHeight, innerHeight, scrollY }: ScrollMetrics) {
  return scrollHeight - innerHeight - scrollY > SCROLL_CUE_STRIP_PX;
}

/**
 * Subtle "there is more below" affordance shown under the showcase. It is
 * decorative and never intercepts taps, and it hides itself once the visitor
 * has reached the end of the page.
 */
export default function ShowcaseScrollCue() {
  const [moreBelow, setMoreBelow] = useState(false);

  useEffect(() => {
    const update = () =>
      setMoreBelow(
        hasMoreBelow({
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
          scrollY: window.scrollY,
        })
      );

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative -mb-6 flex h-6 items-center justify-center transition-opacity duration-700 ${
        moreBelow ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="showcase-scroll-cue-glow" />
      <ChevronDown className="showcase-scroll-cue-chevron h-4 w-4" strokeWidth={2.25} />
    </div>
  );
}
