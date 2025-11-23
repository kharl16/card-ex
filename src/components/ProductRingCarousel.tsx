import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // Touch gesture support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

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

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setPosition((prev) => (prev + 1 >= count ? 0 : prev + 1));
    } else if (isRightSwipe) {
      setPosition((prev) => (prev <= 0 ? count - 1 : prev - 1));
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Lightbox handlers
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    setZoomLevel(1);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setZoomLevel(1);
  };

  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 0.5));
  const resetZoom = () => setZoomLevel(1);

  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % count);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + count) % count);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxIndex, count]);

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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
                  <div 
                    className="h-full w-full overflow-hidden rounded-2xl bg-black/40 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                    onClick={() => openLightbox(logicalIndex)}
                  >
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

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-emerald-500/30">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Zoom controls */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={zoomLevel <= 0.5}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetZoom}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              >
                1:1
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={zoomLevel >= 3}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation arrows */}
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white text-2xl shadow-lg hover:bg-black/80 active:scale-95"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white text-2xl shadow-lg hover:bg-black/80 active:scale-95"
                >
                  ›
                </button>
              </>
            )}

            {/* Image */}
            <div className="w-full h-full overflow-auto flex items-center justify-center p-8">
              <img
                src={baseImages[lightboxIndex]?.url}
                alt={baseImages[lightboxIndex]?.alt ?? ""}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            {/* Image counter */}
            {count > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                {lightboxIndex + 1} / {count}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductImageCarousel;
