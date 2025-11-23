import React, { useEffect, useRef, useState } from "react";

type CarouselImage = {
  id: string;
  url: string;
  alt?: string;
};

interface ProductImageCarouselProps {
  images: CarouselImage[];
  /**
   * Controls how fast the carousel moves in milliseconds.
   * This is the time it would take to move 1 full slide.
   *  - 6000 = slower
   *  - 4000 = default
   *  - 2500 = faster
   */
  autoPlayMs?: number;
}

const VISIBLE_SLIDES = 5;

const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({ images, autoPlayMs = 4000 }) => {
  const baseImages = (images || []).slice(0, 20);
  const count = baseImages.length;
  if (!count) return null;

  // Duplicate images once for looping track
  const loopImages = [...baseImages, ...baseImages];
  const totalSlides = loopImages.length;

  // Position in "slides" (can be fractional), always kept in [0, count)
  const [position, setPosition] = useState(0);
  const isHoveringRef = useRef(false);

  const slideWidthPercent = 100 / VISIBLE_SLIDES;

  // Animation: continuous movement using requestAnimationFrame
  useEffect(() => {
    if (count === 0) return;

    const speedSlidesPerMs = 1 / autoPlayMs; // 1 slide per autoPlayMs
    let lastTime = performance.now();
    let frameId: number;

    const tick = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      setPosition((prev) => {
        if (isHoveringRef.current) return prev; // pause on hover
        let next = prev + dt * speedSlidesPerMs;
        if (next >= count) {
          next -= count; // wrap seamlessly
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [count, autoPlayMs]);

  // 3D / center emphasis based on float position
  const centerOffset = Math.floor(VISIBLE_SLIDES / 2); // 2
  const logicalCenter = (position + centerOffset) % count;

  const cyclicDistance = (a: number, b: number) => {
    const diff = Math.abs(a - b);
    return Math.min(diff, count - diff);
  };

  const computeDepthStyles = (logicalIndex: number) => {
    const dist = cyclicDistance(logicalIndex, logicalCenter); // 0..count/2
    const maxDepth = 2; // emphasize center + nearest neighbours
    const clamped = Math.min(dist, maxDepth);

    // Stronger 3D:
    // center ≈ 1.40, neighbours ≈ 1.18, far slides ≈ 0.96
    const scale = 1.4 - clamped * 0.22;
    const translateZ = (maxDepth - clamped) * 70; // more depth
    const rotateDirection = logicalIndex < logicalCenter ? -1 : 1;
    const rotateY = clamped === 0 ? 0 : rotateDirection * (14 + clamped * 4);
    const opacity = 1 - clamped * 0.2;

    return { scale, translateZ, rotateY, opacity };
  };

  // Translate entire track
  const translatePercent = -(position * slideWidthPercent);

  return (
    <div
      className="relative w-full mx-auto mt-4 mb-6"
      onMouseEnter={() => {
        isHoveringRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
      }}
    >
      <div className="flex w-full justify-center">
        <div
          className="
            relative
            h-[200px] sm:h-[220px]
            w-full
            overflow-hidden
            rounded-2xl
            border border-emerald-500/30
            bg-gradient-to-br from-slate-900 via-slate-950 to-black
            shadow-xl
          "
          style={{ perspective: "1200px" }}
        >
          <div
            className="flex h-full"
            style={{
              transform: `translateX(${translatePercent}%)`,
            }}
          >
            {loopImages.map((img, i) => {
              const logicalIndex = i % count;
              const { scale, translateZ, rotateY, opacity } = computeDepthStyles(logicalIndex);

              return (
                <div
                  key={`${img.id}-${i}`}
                  className="relative h-full flex-shrink-0 transform-gpu px-2 sm:px-3" // MORE spacing between cards
                  style={{
                    width: `${slideWidthPercent}%`,
                    transformStyle: "preserve-3d",
                    transform: `
                      translateZ(${translateZ}px)
                      rotateY(${rotateY}deg)
                      scale(${scale})
                    `,
                    opacity,
                    transition: "transform 220ms linear, opacity 220ms linear",
                  }}
                >
                  <div className="h-full w-full overflow-hidden rounded-2xl bg-black/40 flex items-center justify-center">
                    <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-contain" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* arrows (jump one full slide left/right) */}
          <button
            type="button"
            onClick={() => setPosition((prev) => (prev <= 0 ? count - 1 : prev - 1))}
            className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-slate-100 text-sm shadow-lg ring-1 ring-emerald-500/40 backdrop-blur hover:bg-black/80 active:scale-95"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setPosition((prev) => (prev + 1 >= count ? 0 : prev + 1))}
            className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-slate-100 text-sm shadow-lg ring-1 ring-emerald-500/40 backdrop-blur hover:bg-black/80 active:scale-95"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductImageCarousel;
