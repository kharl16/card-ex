import { useEffect, useState, useMemo } from "react";
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
}: KenBurnsRotatorProps) {
  const safeItems = useMemo(
    () => items.filter((it) => it && typeof it.url === "string" && it.url),
    [items]
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (safeItems.length <= 1 || autoPlayMs <= 0) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % safeItems.length);
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [safeItems.length, autoPlayMs]);

  // Reset index if items array shrinks
  useEffect(() => {
    if (active >= safeItems.length) setActive(0);
  }, [safeItems.length, active]);

  if (safeItems.length === 0) return null;

  // Each cycle: total duration ≈ autoPlayMs + fadeMs so motion finishes around
  // crossfade time. We stagger animation-delay per slot using nth-child semantics.
  const motionDuration = Math.max(autoPlayMs + fadeMs, 4000);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        background,
      }}
    >
      {/* Inline keyframes so we don't depend on global config */}
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
