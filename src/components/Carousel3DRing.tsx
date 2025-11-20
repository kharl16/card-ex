import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images: string[];
  height?: number;       // px height of the ring container
  radius?: number;       // px Z‑distance of items from center; defaults to height*1.45
  gapDeg?: number;       // degrees between items (wider = more spacing)
  activeScale?: number;  // scale factor for the center/active card
  tilt?: number;         // max degrees of parallax tilt on pointer
  autoplay?: boolean;
  speedDeg?: number;     // degrees per animation frame (~60 fps)
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Carousel3DRing({
  images: rawImages,
  height = 380,
  radius,
  gapDeg = 52,
  activeScale = 1.26,
  tilt = 5,
  autoplay = true,
  speedDeg = 0.22,
}: Props) {
  const images = (rawImages || []).filter(Boolean);
  const R = radius ?? Math.max(360, Math.floor(height * 1.45));
  const GAP = gapDeg;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tiltXY, setTiltXY] = useState({ rx: 0, ry: 0 });
  const reduceMotion = prefersReducedMotion();

  // base angles for each item
  const bases = useMemo(() => images.map((_, i) => i * GAP), [images, GAP]);

  // autoplay spin
  useEffect(() => {
    if (!autoplay || reduceMotion) {
      console.log('Carousel autoplay disabled:', { autoplay, reduceMotion });
      return;
    }
    console.log('Carousel autoplay starting with speedDeg:', speedDeg);
    let raf = 0;
    const tick = () => {
      setRotation((r) => {
        const newRotation = paused ? r : r - speedDeg;
        return newRotation;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, speedDeg, paused, reduceMotion]);

  // active (closest to front, i.e., angle ≈ 0)
  const norm = (a: number) => ((a % 360) + 360) % 360;
  const activeIndex = useMemo(() => {
    let best = 0;
    let bestDelta = Infinity;
    bases.forEach((base, i) => {
      const ang = norm(base + rotation);
      const delta = Math.min(Math.abs(ang), Math.abs(360 - ang));
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    });
    return best;
  }, [bases, rotation]);

  // drag/swipe
  const drag = useRef<{ startX: number; startRot: number } | null>(null);
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    drag.current = { startX: e.clientX, startRot: rotation };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPaused(true);
  };
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    setRotation(drag.current.startRot + dx * 0.15);
  };
  const endDrag = () => {
    drag.current = null;
    setPaused(false);
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setRotation((r) => r + GAP);
      if (e.key === "ArrowRight") setRotation((r) => r - GAP);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [GAP]);

  // parallax tilt for the active card only
  const onMouseMoveActive: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = ((cy - e.clientY) / rect.height) * tilt; // rotateX
    const ry = ((e.clientX - cx) / rect.width) * tilt;  // rotateY
    setTiltXY({ rx, ry });
  };
  const onMouseLeaveActive = () => setTiltXY({ rx: 0, ry: 0 });

  // helpers
  const size = Math.floor(height * 0.82);
  const perspective = 1600;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ height }}
    >
      <div
        className="absolute inset-0"
        style={{ perspective: `${perspective}px` }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${rotation}deg)`,
            transition: paused ? "none" : "transform 300ms ease-out",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-roledescription="3D ring carousel"
        >
          {images.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-sm text-emerald-300/70">
              No images yet
            </div>
          )}

          {images.map((src, i) => {
            const base = bases[i];
            const isActive = i === activeIndex;
            const scale = isActive ? activeScale : 0.88;
            const opacity = isActive ? 1 : 0.6;
            const blur = isActive ? 0 : 1;
            const rx = isActive && !reduceMotion ? tiltXY.rx : 0;
            const ry = isActive && !reduceMotion ? tiltXY.ry : 0;

            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 will-change-transform"
                style={{
                  transform: `rotateY(${base}deg) translateZ(${R}px) translate(-50%, -50%)`,
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  role="listitem"
                  className="relative overflow-hidden rounded-2xl ring-1 ring-emerald-400/20 bg-black/40"
                  style={{
                    width: size,
                    height: size,
                    transform: `rotateY(${-rotation}deg) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
                    transition: "transform 280ms ease, filter 280ms ease, opacity 280ms ease",
                    opacity,
                    filter: `blur(${blur}px)`
                  }}
                  onMouseMove={isActive ? onMouseMoveActive : undefined}
                  onMouseLeave={isActive ? onMouseLeaveActive : undefined}
                >
                  <img
                    src={src}
                    alt={`image ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />

                  {/* reflection */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 22%, rgba(255,255,255,0) 48%)",
                      mixBlendMode: "screen",
                      opacity: isActive ? 0.55 : 0.18,
                    }}
                  />

                  {/* glow & shadow */}
                  <div
                    className="pointer-events-none absolute -inset-4"
                    style={{
                      boxShadow: isActive
                        ? "0 40px 120px rgba(16,185,129,0.35), 0 12px 48px rgba(0,0,0,0.55)"
                        : "0 12px 32px rgba(0,0,0,0.35)",
                    }}
                  />

                  {/* gold edge */}
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-emerald-300/30" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 0 1px rgba(234, 179, 8, 0.25)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* dots */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to ${i + 1}`}
              onClick={() => setRotation(-i * GAP)}
              className={
                "h-2.5 w-2.5 rounded-full transition transform hover:scale-110 focus:scale-110 outline-none" +
                (i === activeIndex
                  ? " bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
                  : " bg-emerald-400/40")
              }
            />
          ))}
        </div>
      )}

      {/* accessibility hint */}
      <div className="sr-only">Use left/right arrow keys to rotate the carousel.</div>
    </div>
  );
}
