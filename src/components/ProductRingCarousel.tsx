import React, { useEffect, useMemo, useRef, useState } from "react";

type CarouselImage = {
  id: string;
  url: string;
  alt?: string;
};

interface ProductRingCarouselProps {
  images: CarouselImage[];
}

const ProductRingCarousel: React.FC<ProductRingCarouselProps> = ({ images }) => {
  const visibleImages = useMemo(
    () => (images || []).slice(0, 20),
    [images]
  );

  const count = visibleImages.length;

  // Nothing: no images
  if (count === 0) {
    return null;
  }

  // Simple non-3D layout for a single image
  if (count === 1) {
    const img = visibleImages[0];
    return (
      <div className="flex w-full items-center justify-center py-4">
        <div className="relative h-[220px] w-[260px] overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-900/60 via-slate-900 to-black shadow-lg">
          <img
            src={img.url}
            alt={img.alt ?? ""}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    );
  }

  // 3D ring for 2+ images
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const accumulatedDeltaX = useRef(0);

  const step = 360 / count;
  const radius = 300; // Distance from ring center; controls spacing

  // Auto-rotation: continuous (smooth) movement
  useEffect(() => {
    if (count < 2) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion) return;

    const tickMs = 100; // 0.1s per tick
    // We want: 1 image per second, so 360/count degrees per second.
    // Per tick we move (360 / count) * (tickMs / 1000).
    const deltaPerTick = (360 / count) * (tickMs / 1000);

    const id = window.setInterval(() => {
      // Pause during drag
      if (!isDragging) {
        setAngle((prev) => prev - deltaPerTick);
      }
    }, tickMs);

    return () => window.clearInterval(id);
  }, [count, isDragging]);

  // Normalize angle to [-180, 180] for "front" computation
  const normalizeAngle = (deg: number) => {
    let a = deg % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
  };

  // Pointer handlers (mouse + touch) for roulette-style swipe
  const handlePointerDown = (clientX: number) => {
    setIsDragging(true);
    dragStartX.current = clientX;
    accumulatedDeltaX.current = 0;
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDragging || dragStartX.current == null) return;
    const dx = clientX - dragStartX.current;
    accumulatedDeltaX.current = dx;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;

    setIsDragging(false);

    const dx = accumulatedDeltaX.current;
    dragStartX.current = null;
    accumulatedDeltaX.current = 0;

    if (Math.abs(dx) < 30) {
      // Tiny swipe - ignore
      return;
    }

    // Decide how many steps to move based on swipe distance
    const stepWidthPx = 80; // pixels per image
    let steps = Math.round(dx / stepWidthPx);

    // Clamp to avoid jumping too far in one swipe
    const maxSteps = 3;
    if (steps > maxSteps) steps = maxSteps;
    if (steps < -maxSteps) steps = -maxSteps;

    // Positive dx means swipe right -> previous image
    setAngle((prev) => prev + steps * step);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerDown(e.clientX);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handlePointerMove(e.clientX);
  };

  const handleMouseUp = () => {
    handlePointerUp();
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handlePointerDown(t.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handlePointerMove(t.clientX);
  };

  const handleTouchEnd = () => {
    handlePointerUp();
  };

  return (
    <div className="relative w-full py-4">
      <div className="flex w-full items-center justify-center">
        {/* Outer container with perspective so 3D looks right */}
        <div
          className="relative h-[270px] w-full max-w-[520px] overflow-visible"
          style={{ perspective: "1200px" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Inner ring */}
          <div
            className="absolute left-1/2 top-1/2 h-[220px] w-[260px] -translate-x-1/2 -translate-y-1/2 transform-gpu"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {visibleImages.map((img, index) => {
              const baseAngle = index * step;
              const currentAngle = baseAngle + angle;
              const normalized = normalizeAngle(currentAngle);

              // Use normalized angle for emphasis: 0° = front
              const closeness = 1 - Math.min(
                Math.abs(normalized) / 90,
                1
              ); // 1 at front, 0 at ±90+

              const scale = 1 + closeness * 0.12; // Front card slightly bigger
              const zIndex = 10 + Math.round(closeness * 10);

              const translateZ = radius;
              const rotateY = currentAngle;

              return (
                <div
                  key={img.id ?? index}
                  className="absolute left-1/2 top-1/2 h-[190px] w-[240px] -translate-x-1/2 -translate-y-1/2 transform-gpu transition-transform duration-500 ease-out"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `
                      rotateY(${rotateY}deg)
                      translateZ(${translateZ}px)
                      scale(${scale})
                    `,
                    zIndex,
                    boxShadow:
                      closeness > 0.7
                        ? "0 18px 40px rgba(0,0,0,0.55)"
                        : "0 8px 20px rgba(0,0,0,0.35)",
                    borderRadius: "1rem",
                    overflow: "hidden",
                    background:
                      "radial-gradient(circle at top, rgba(16,185,129,0.25), rgba(15,23,42,0.95))",
                    border: closeness > 0.6 ? "1px solid rgba(16,185,129,0.85)" : "1px solid rgba(148,163,184,0.35)",
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? ""}
                    className="h-full w-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductRingCarousel;
