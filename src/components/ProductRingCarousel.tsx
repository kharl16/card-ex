import React, { useEffect, useRef, useState } from "react";

type CarouselImage = {
  id: string;
  url: string;
  alt?: string;
};

interface ProductRingCarouselProps {
  images: CarouselImage[];
  autoPlayMs?: number;
}

const ProductRingCarousel: React.FC<ProductRingCarouselProps> = ({
  images,
  autoPlayMs = 4000,
}) => {
  const visibleImages = (images || []).slice(0, 20);
  const count = visibleImages.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  if (count === 0) return null;

  // Single image layout
  if (count === 1) {
    const img = visibleImages[0];
    return (
      <div className="flex w-full items-center justify-center py-3">
        <div className="relative h-[160px] w-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900/60 shadow-lg">
          <img
            src={img.url}
            alt={img.alt ?? ""}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    );
  }

  const goTo = (index: number) => {
    if (!count) return;
    setActiveIndex((index + count) % count);
  };

  const next = () => goTo(activeIndex + 1);
  const prev = () => goTo(activeIndex - 1);

  // Auto-play
  useEffect(() => {
    if (count <= 1 || isHovering) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReducedMotion) return;

    const id = window.setInterval(next, autoPlayMs);
    return () => window.clearInterval(id);
  }, [count, activeIndex, isHovering, autoPlayMs]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const t = e.touches[0];
    touchDeltaX.current = t.clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;

    if (Math.abs(dx) < 40) return;
    if (dx < 0) next();
    else prev();
  };

  // Keyboard arrows
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
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
            h-[150px] sm:h-[170px]
            w-full
            overflow-hidden
            rounded-2xl
            border border-emerald-500/30
            bg-gradient-to-br from-slate-900 via-slate-950 to-black
            shadow-xl
          "
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slider track */}
          <div
            className="flex h-full w-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {visibleImages.map((img) => (
              <div key={img.id} className="relative h-full w-full flex-shrink-0">
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
              </div>
            ))}
          </div>

          {/* Arrows */}
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

          {/* Dots */}
          <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
            {visibleImages.map((img, index) => (
              <button
                key={img.id + "-dot"}
                type="button"
                onClick={() => goTo(index)}
                className={`pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "w-5 bg-emerald-400"
                    : "w-2 bg-slate-500/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductRingCarousel;
