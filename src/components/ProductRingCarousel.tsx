import React, { useEffect, useState } from "react";

type CarouselImage = {
  id: string;
  url: string;
  alt?: string;
};

interface ProductImageCarouselProps {
  images: CarouselImage[];
  autoPlayMs?: number;
}

const VISIBLE_SLIDES = 5;

const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({
  images,
  autoPlayMs = 4000,
}) => {
  const baseImages = (images || []).slice(0, 20);
  const count = baseImages.length;
  if (!count) return null;

  // Clone first + last for seamless infinite loop
  const extended = [baseImages[count - 1], ...baseImages, baseImages[0]];

  // Start at first real slide (index 1 in extended)
  const [index, setIndex] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const slideWidthPercent = 100 / VISIBLE_SLIDES;
  const translatePercent = -index * slideWidthPercent;

  const goTo = (nextIndex: number) => {
    setIndex(nextIndex);
    setIsAnimating(true);
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Autoplay with pause on hover and reduced-motion respect
  useEffect(() => {
    if (isHovering) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReducedMotion) return;

    const id = window.setInterval(next, autoPlayMs);
    return () => window.clearInterval(id);
  }, [index, isHovering, autoPlayMs]);

  // Handle seamless jump when we hit a clone
  const handleTransitionEnd = () => {
    if (index === extended.length - 1) {
      // moved past last real → jump to first real
      setIsAnimating(false);
      setIndex(1);
    } else if (index === 0) {
      // moved before first real → jump to last real
      setIsAnimating(false);
      setIndex(extended.length - 2);
    }
  };

  // Re-enable animation after the teleport frame
  useEffect(() => {
    if (!isAnimating) {
      const id = window.setTimeout(() => setIsAnimating(true), 20);
      return () => window.clearTimeout(id);
    }
  }, [isAnimating]);

  // 3D / center emphasis styles
  const centerOffset = Math.floor(VISIBLE_SLIDES / 2); // 2
  const visualCenterIndex = index + centerOffset;

  const computeDepthStyles = (i: number) => {
    const dist = Math.abs(i - visualCenterIndex); // 0,1,2,...
    const maxDepth = 3;
    const clamped = Math.min(dist, maxDepth);

    // Center bigger, sides smaller
    const scale = 1.12 - clamped * 0.06; // 1.12, 1.06, 1.00, ...
    const translateZ = (maxDepth - clamped) * 40; // center closest
    const rotateDirection = i < visualCenterIndex ? -1 : 1;
    const rotateY =
      dist === 0 ? 0 : rotateDirection * (8 + clamped * 2);
    const opacity = 1 - clamped * 0.12;

    return { scale, translateZ, rotateY, opacity };
  };

  return (
    <div
      className="relative w-full mx-auto mt-4 mb-6"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
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
            className={`flex h-full transition-transform ${
              isAnimating ? "duration-500 ease-out" : ""
            }`}
            style={{
              transform: `translateX(${translatePercent}%)`,
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extended.map((img, i) => {
              const { scale, translateZ, rotateY, opacity } =
                computeDepthStyles(i);

              return (
                <div
                  key={`${img.id}-${i}`}
                  className="relative h-full flex-shrink-0 transform-gpu"
                  style={{
                    width: `${slideWidthPercent}%`,
                    transformStyle: "preserve-3d",
                    transform: `
                      translateZ(${translateZ}px)
                      rotateY(${rotateY}deg)
                      scale(${scale})
                    `,
                    opacity,
                    transition:
                      "transform 0.5s ease-out, opacity 0.5s ease-out",
                  }}
                >
                  <div className="h-full w-full overflow-hidden rounded-2xl border border-emerald-500/40 bg-black/40 flex items-center justify-center">
                    <img
                      src={img.url}
                      alt={img.alt ?? ""}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* arrows */}
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-slate-100 text-sm shadow-lg ring-1 ring-emerald-500/40 backdrop-blur hover:bg-black/80 active:scale-95"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
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
