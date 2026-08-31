import { useEffect, useRef, useState } from "react";

interface QuoteBackdropProps {
  /** Imported image URL used as the decorative texture. */
  src: string;
  /** Where to anchor the image when the container aspect ratio differs. */
  objectPosition?: "center" | "right" | "left" | "top" | "bottom";
  /** Enable a very subtle pointer-driven float. Only active on fine pointers (desktop). */
  parallax?: boolean;
}

/**
 * Decorative photographic texture behind a quote / scripture slide.
 * Purely presentational: hidden from a11y, never intercepts pointer events,
 * and always sits under a scrim so the text keeps its contrast.
 *
 * If the image fails to load (missing/blocked asset) we gracefully fall back
 * to a solid gold-silk gradient so the block never looks broken.
 */
export function QuoteBackdrop({ src, objectPosition = "center", parallax = false }: QuoteBackdropProps) {
  const positionClass = {
    center: "object-center",
    right: "object-right",
    left: "object-left",
    top: "object-top",
    bottom: "object-bottom",
  }[objectPosition];

  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!parallax) return;
    const host = rootRef.current?.parentElement;
    if (!host) return;

    // Desktop only: skip touch/coarse pointers and reduced-motion users.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      // Max ~8px drift — deliberately barely perceptible.
      setOffset({ x: -nx * 8, y: -ny * 8 });
    };
    const onLeave = () => setOffset({ x: 0, y: 0 });

    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
    return () => {
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
    };
  }, [parallax]);

  const floatStyle = parallax
    ? {
        transform: `scale(1.06) translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform" as const,
      }
    : undefined;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {failed ? (
        <div
          className="h-full w-full opacity-75"
          style={{
            ...floatStyle,
            background:
              "linear-gradient(135deg, hsl(45 65% 12%) 0%, hsl(43 78% 30%) 35%, hsl(48 90% 52%) 50%, hsl(43 78% 28%) 68%, hsl(45 60% 10%) 100%)",
          }}
        />
      ) : (
        <img
          src={src}
          alt=""
          width={1280}
          height={800}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={floatStyle}
          className={`h-full w-full object-cover opacity-75 ${positionClass}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/60 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/30" />
      <div className="absolute inset-0 mix-blend-overlay opacity-25 bg-gradient-to-br from-primary/40 to-transparent" />
    </div>
  );
}
