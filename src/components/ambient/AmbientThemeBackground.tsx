import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getAmbientParallaxOffsets, normalizeAmbientTheme } from "@/lib/ambientThemes";

interface AmbientThemeBackgroundProps {
  theme: unknown;
  /** Use inside the Editor or a thumbnail instead of covering the viewport. */
  contained?: boolean;
  /** Thumbnails keep their gentle ambient animation but do not listen to page input. */
  staticPreview?: boolean;
  className?: string;
}

const PARTICLES = Array.from({ length: 12 }, (_, index) => index);

export default function AmbientThemeBackground({
  theme,
  contained = false,
  staticPreview = false,
  className,
}: AmbientThemeBackgroundProps) {
  const themeId = normalizeAmbientTheme(theme);
  const rootRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || themeId === "classic" || staticPreview || reducedMotion) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const paint = () => {
      frame = 0;
      const offsets = getAmbientParallaxOffsets(window.scrollY);
      root.style.setProperty("--ambient-far-shift", `${offsets.far}px`);
      root.style.setProperty("--ambient-middle-shift", `${offsets.middle}px`);
      root.style.setProperty("--ambient-near-shift", `${offsets.near}px`);
      root.style.setProperty("--ambient-pointer-x", `${pointerX}px`);
      root.style.setProperty("--ambient-pointer-y", `${pointerY}px`);
    };

    const schedulePaint = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointerX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 10;
      pointerY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 8;
      schedulePaint();
    };

    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", schedulePaint, { passive: true });
    window.addEventListener("pointermove", handlePointer, { passive: true });
    paint();

    return () => {
      window.removeEventListener("scroll", schedulePaint);
      window.removeEventListener("resize", schedulePaint);
      window.removeEventListener("pointermove", handlePointer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion, staticPreview, themeId]);

  if (themeId === "classic") return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-ambient-theme={themeId}
      data-ambient-motion={reducedMotion ? "reduced" : staticPreview ? "ambient" : "parallax"}
      className={cn("ambient-theme", contained && "ambient-theme--contained", className)}
    >
      <div className="ambient-base" />
      <div className="ambient-layer ambient-layer--far">
        <span className="ambient-orb ambient-orb--a" />
        <span className="ambient-orb ambient-orb--b" />
        <span className="ambient-ring ambient-ring--a" />
        <span className="ambient-grid" />
        <span className="ambient-carbon" />
      </div>
      <div className="ambient-layer ambient-layer--middle">
        <span className="ambient-orb ambient-orb--c" />
        <span className="ambient-ring ambient-ring--b" />
        <span className="ambient-rosette" />
        <span className="ambient-horizon" />
        <span className="ambient-sheen" />
      </div>
      <div className="ambient-layer ambient-layer--near">
        {PARTICLES.map((particle) => (
          <span key={particle} className="ambient-particle" />
        ))}
      </div>
      <div className="ambient-vignette" />
    </div>
  );
}
