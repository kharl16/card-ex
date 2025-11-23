import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, X, Download } from "lucide-react";
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
   * This is the time it would take to move 1 full slide
   * from the base auto-scroll (before swipe momentum).
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

  // Position in "slides" (can be fractional), always kept in [0, count)
  const [position, setPosition] = useState(0);

  // Momentum velocity (extra speed from swipe), slides per ms
  const velocityRef = useRef(0);

  // Touch gesture support (for momentum)
  const touchStartX = useRef<number | null>(null);
  const touchLastX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const slideWidthPercent = 100 / VISIBLE_SLIDES;

  // Animation: continuous movement using requestAnimationFrame
  useEffect(() => {
    if (count === 0) return;

    // Base speed from autoPlayMs (slides per ms)
    const baseSpeedSlidesPerMs = 1 / autoPlayMs;
    let lastTime = performance.now();
    let frameId: number;

    const tick = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      setPosition((prev) => {
        let v = velocityRef.current;

        // Cap max momentum so it doesn't go crazy
        const maxAbsVelocity = 0.004; // slides per ms
        if (Math.abs(v) > maxAbsVelocity) {
          v = maxAbsVelocity * Math.sign(v);
          velocityRef.current = v;
        }

        // Total speed = base auto speed + momentum
        const totalSpeed = baseSpeedSlidesPerMs + v;
        let next = prev + totalSpeed * dt;

        // Wrap seamlessly
        if (next >= count) next -= count;
        if (next < 0) next += count;

        // More roulette-like friction: longer spin, smooth fade out
        if (v !== 0) {
          const frictionBase = 0.985; // closer to 1 = longer spin
          const friction = Math.pow(frictionBase, dt / 16.67);
          v *= friction;
          if (Math.abs(v) < 0.00003) v = 0;
          velocityRef.current = v;
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

    // Strong 3D, but smooth:
    // center ≈ 1.40, neighbours ≈ 1.18, far slides ≈ 0.96
    const scale = 1.4 - clamped * 0.22;
    const translateZ = (maxDepth - clamped) * 70;
    const rotateDirection = logicalIndex < logicalCenter ? -1 : 1;
    const rotateY = clamped === 0 ? 0 : rotateDirection * (14 + clamped * 4);
    const opacity = 1 - clamped * 0.2;

    return { scale, translateZ, rotateY, opacity };
  };

  // Translate entire track
  const translatePercent = -(position * slideWidthPercent);

  // Touch handlers with momentum
  const handleTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    touchStartX.current = x;
    touchLastX.current = x;
    touchStartTime.current = performance.now();

    // When user starts a swipe, slightly dampen current momentum
    velocityRef.current *= 0.4;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchLastX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current == null || touchLastX.current == null || touchStartTime.current == null) {
      touchStartX.current = null;
      touchLastX.current = null;
      touchStartTime.current = null;
      return;
    }

    const dx = touchLastX.current - touchStartX.current; // + right, - left
    const dt = performance.now() - touchStartTime.current;

    touchStartX.current = null;
    touchLastX.current = null;
    touchStartTime.current = null;

    if (dt < 30 || Math.abs(dx) < 10) {
      // Tiny gesture – ignore
      return;
    }

    // Convert swipe into extra velocity (slides per ms)
    // Negative dx (swipe left) → positive velocity (move forward)
    const pixelsPerSlideApprox = 100; // more responsive "roulette" feel
    const slidesMovedGuess = dx / pixelsPerSlideApprox;
    const swipeSpeedSlidesPerMs = slidesMovedGuess / dt;

    // We invert because left swipe (negative dx) should move carousel forward
    const momentum = -swipeSpeedSlidesPerMs * 1.6; // more casino-style spin

    // Add to current velocity
    velocityRef.current += momentum;
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

  // Download current lightbox image
  const handleDownload = () => {
    const current = baseImages[lightboxIndex];
    if (!current?.url) return;

    const link = document.createElement("a");
    link.href = current.url;
    // leave download empty so browser uses the filename from URL
    link.download = "";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      if (e.key.toLowerCase() === "s") handleDownload(); // optional: "S" to save
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxIndex, count]);

  return (
    <div className="relative w-full mx-auto mt-4 mb-6">
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
                  className="relative h-full flex-shrink-0 transform-gpu px-2 sm:px-3"
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
                    className="h-full w-full overflow-hidden rounded-2xl bg-transparent flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                    onClick={() => openLightbox(logicalIndex)}
                  >
                    <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-contain" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* arrows (jump one full slide left/right by tweaking position directly) */}
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

            {/* Zoom + Download controls */}
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
              {/* Download button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation arrows in lightbox */}
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
