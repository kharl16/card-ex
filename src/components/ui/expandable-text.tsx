import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  lines: number;
  expanded: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Allow inner scroll once expanded (useful for fixed-height containers). */
  scrollWhenExpanded?: boolean;
  as?: "p" | "div";
}

/**
 * Smoothly animates between a clamped (N-line) state and the full text.
 * Uses measured pixel heights so the transition is fluid (line-clamp itself
 * is not animatable).
 */
export function ExpandableText({
  text,
  lines,
  expanded,
  className,
  style,
  scrollWhenExpanded = false,
  as = "p",
}: ExpandableTextProps) {
  const innerRef = useRef<HTMLDivElement | HTMLParagraphElement>(null);
  const [fullHeight, setFullHeight] = useState<number>(0);
  const [collapsedHeight, setCollapsedHeight] = useState<number>(0);

  const measure = () => {
    const el = innerRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    let lh = parseFloat(cs.lineHeight);
    if (Number.isNaN(lh)) {
      lh = parseFloat(cs.fontSize) * 1.4;
    }
    setCollapsedHeight(Math.ceil(lh * lines));
    setFullHeight(el.scrollHeight);
  };

  useLayoutEffect(() => {
    measure();
    // re-measure after fonts/images settle
    const t = setTimeout(measure, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lines]);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(innerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targetHeight = expanded
    ? fullHeight || "auto"
    : Math.min(collapsedHeight || 0, fullHeight || collapsedHeight || 0) ||
      collapsedHeight;

  const Inner: any = as;

  return (
    <motion.div
      initial={false}
      animate={{ height: targetHeight }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        overflow: expanded && scrollWhenExpanded ? "auto" : "hidden",
        width: "100%",
      }}
    >
      <Inner
        ref={innerRef as any}
        className={cn("whitespace-pre-wrap", className)}
        style={style}
      >
        {text}
      </Inner>
    </motion.div>
  );
}
