import { useEffect, useRef, useState, useMemo } from "react";
import { cdnImage } from "@/lib/cdnImage";

export interface KenBurnsItem {
  url: string;
  alt?: string;
}

interface KenBurnsRotatorProps {
  items: KenBurnsItem[];
  /** Time (ms) each image is on screen before crossfading to the next. */
  autoPlayMs?: number;
  /** Crossfade duration in ms. */
  fadeMs?: number;
  /** object-fit behavior. */
  objectFit?: "cover" | "contain";
  className?: string;
  imgClassName?: string;
  /** Background fill (visible when contain leaves bars, or before first paint). */
  background?: string;
  /** Disable the Ken Burns zoom/pan motion (only crossfade between images). */
  staticMotion?: boolean;
  /** Optional alt fallback used when item.alt is missing. */
  altFallback?: string;
  /** Optional CDN-resize hint in CSS pixels. The helper requests a slightly
   *  larger image to look crisp on retina screens. */
  cdnWidth?: number;
  /** When true, defer starting the auto-rotation until the component has been
   *  visible in the viewport for a short delay. Also pauses when offscreen. */
  lazyStart?: boolean;
  /** Number of upcoming slides to keep mounted alongside the active one.
   *  Other slides render as a placeholder until they're about to be shown. */
  preloadAhead?: number;
}

/**
 * KenBurnsRotator
 * Renders a stack of images that crossfade between each other while the active
 * image performs a slow Ken-Burns style zoom + pan. Falls back to a single
 * static image when only one item is provided.
 */
export default function KenBurnsRotator({
  items,
  autoPlayMs = 5000,
  fadeMs = 1200,
  objectFit = "cover",
  className,
  imgClassName,
  background,
  staticMotion = false,
  altFallback,
  cdnWidth,
  lazyStart = false,
  preloadAhead = Infinity,
}: KenBurnsRotatorProps) {
  const safeItems = useMemo(
    () => items.filter((it) => it && typeof it.url === "string" && it.url),
    [items]
  );
  const [active, setActive] = useState(0);
  const [canStart, setCanStart] = useState(!lazyStart);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(!lazyStart);

  // Lazy start: wait until the element is intersecting the viewport for ~5s
  useEffect(() => {
    if (!lazyStart) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setCanStart(true);
      setInView(true);
      return;
    }
    let delayId: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        setInView(visible);
        if (visible && delayId === undefined) {
          delayId = window.setTimeout(() => setCanStart(true), 5000);
        } else if (!visible && delayId !== undefined) {
          window.clearTimeout(delayId);
          delayId = undefined;
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (delayId !== undefined) window.clearTimeout(delayId);
    };
  }, [lazyStart]);

  useEffect(() => {
    if (safeItems.length <= 1 || autoPlayMs <= 0) return;
    if (!canStart || !inView) return;
    let id: number | undefined;
    const start = () => {
      if (id !== undefined) return;
      id = window.setInterval(() => {
        setActive((prev) => (prev + 1) % safeItems.length);
      }, autoPlayMs);
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    if (typeof document === "undefined" || document.visibilityState === "visible") start();
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [safeItems.length, autoPlayMs, canStart, inView]);

  // Reset index if items array shrinks
  useEffect(() => {
    if (active >= safeItems.length) setActive(0);
  }, [safeItems.length, active]);

  if (safeItems.length === 0) return null;

  const motionDuration = Math.max(autoPlayMs + fadeMs, 4000);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        background,
      }}
    >
      <style>{`
        @keyframes kenburns-a {
          0%   { transform: scale(1.0)  translate(0%, 0%); }
          100% { transform: scale(1.18) translate(-3%, -2%); }
        }
        @keyframes kenburns-b {
          0%   { transform: scale(1.18) translate(2%, 1%); }
          100% { transform: scale(1.0)  translate(0%, 0%); }
        }
        @keyframes kenburns-c {
          0%   { transform: scale(1.05) translate(-2%, 2%); }
          100% { transform: scale(1.22) translate(2%, -2%); }
        }
      `}</style>

      {safeItems.map((item, idx) => {
        const isActive = idx === active;
        const motionName = ["kenburns-a", "kenburns-b", "kenburns-c"][idx % 3];
        // Only mount the active slide and the next `preloadAhead` slides (circular)
        const distance = (idx - active + safeItems.length) % safeItems.length;
        const shouldMount = distance <= preloadAhead;
        if (!shouldMount) return null;
        return (
          <img
            key={`${item.url}-${idx}`}
            src={cdnWidth ? cdnImage(item.url, { width: Math.round(cdnWidth * 2), quality: 80 }) : item.url}
            alt={item.alt || altFallback || `Image ${idx + 1}`}
            decoding="async"
            loading={idx === 0 ? "eager" : "lazy"}
            draggable={false}
            className={imgClassName}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit,
              opacity: isActive ? 1 : 0,
              transition: `opacity ${fadeMs}ms ease-in-out`,
              willChange: "opacity, transform",
              animation: staticMotion
                ? undefined
                : `${motionName} ${motionDuration}ms ease-in-out infinite alternate`,
              animationPlayState: isActive ? "running" : "paused",
              userSelect: "none",
            }}
          />
        );
      })}
    </div>
  );
}
