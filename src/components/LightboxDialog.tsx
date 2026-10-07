import React, { useCallback, useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { CloseButton3D } from "@/components/ui/close-button-3d";
import { shareSingleImage, downloadSingleImage } from "@/lib/share";
import ShareModal from "@/components/carousel/ShareModal";
import type { LightboxImage } from "@/hooks/useLightbox";
import { getOriginalUrl } from "@/lib/images";
import SafeImage from "@/components/SafeImage";
import { preloadImage } from "@/lib/images/lightboxPreloadCache";

export interface LightboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage?: LightboxImage;
  index: number;
  count: number;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDownload: () => void;
  onClose: () => void;
  /** The PUBLIC card URL - must be https://tagex.app/c/{slug}, never editor URL */
  shareUrl?: string;
  /** All images (for neighbor preloading). Optional — falls back to currentImage only. */
  images?: LightboxImage[];
  /** Slide/fade transition duration in ms. Default 180. */
  transitionMs?: number;
}

/** Render one slide with the current pan/zoom transform applied. */
function LightboxSlide({
  image,
  panOffset,
  zoomLevel,
  onDimensions,
  isActive,
  fullScreen,
}: {
  image?: LightboxImage;
  panOffset: { x: number; y: number };
  zoomLevel: number;
  onDimensions?: (d: { width: number; height: number }) => void;
  isActive: boolean;
  fullScreen?: boolean;
}) {
  if (!image) return <div className="w-full h-full" aria-hidden />;
  const transformStyle = isActive
    ? {
        transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
        transformOrigin: "center center" as const,
        willChange: "transform" as const,
      }
    : undefined;
  return (
    <div className="w-full h-full flex items-center justify-center pointer-events-none">
      <img
        src={getOriginalUrl(image.url)}
        alt={image.alt ?? ""}
        draggable={false}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth && el.naturalHeight) {
            onDimensions?.({ width: el.naturalWidth, height: el.naturalHeight });
          }
        }}
        className={
          "pointer-events-auto select-none object-contain max-h-full w-auto h-auto " +
          (fullScreen ? "max-w-[100vw]" : "max-w-[calc(95vw-4rem)]")
        }
        style={transformStyle}
      />
    </div>
  );
}

export default function LightboxDialog({
  open,
  onOpenChange,
  currentImage,
  index,
  count,
  zoomLevel,
  setZoomLevel,
  onResetZoom,
  onNext,
  onPrev,
  onDownload,
  onClose,
  shareUrl,
  images,
  transitionMs,
}: LightboxDialogProps) {
  const prefersReducedMotion = useReducedMotion();

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [aspect, setAspect] = useState<number>(1);
  const [fullScreen, setFullScreen] = useState(false);
  const isLandscape = aspect > 1.2;
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const panOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset aspect when the image changes
  useEffect(() => {
    setAspect(1);
  }, [currentImage?.url]);

  // Leave full-screen gallery whenever the lightbox is closed
  useEffect(() => {
    if (!open) setFullScreen(false);
  }, [open]);

  // Preload current + ±2 neighbors through the module-level LRU cache
  useEffect(() => {
    if (!open) return;
    if (currentImage?.url) preloadImage(getOriginalUrl(currentImage.url), "high");
    if (!images || images.length < 2) return;
    for (const offset of [1, -1, 2, -2]) {
      const target = images[((index + offset) % images.length + images.length) % images.length];
      if (target?.url) {
        preloadImage(getOriginalUrl(target.url), Math.abs(offset) === 1 ? "low" : "auto");
      }
    }
  }, [open, images, index, currentImage?.url]);

  const handleDownload = useCallback(async () => {
    if (!currentImage?.url) return;
    await downloadSingleImage(currentImage.url);
    onDownload();
  }, [currentImage, onDownload]);

  const handleShare = useCallback(async () => {
    if (!currentImage?.url) return;
    const result = await shareSingleImage({
      imageUrl: currentImage.url,
      title: currentImage.alt || "Check out this image!",
      text: currentImage.shareText || "Check out this image from Card-Ex",
      url: shareUrl,
    });
    if (result.showModal) setShareModalOpen(true);
  }, [currentImage, shareUrl]);

  const resetPan = useCallback(() => setPanOffset({ x: 0, y: 0 }), []);
  const handleResetZoom = useCallback(() => {
    onResetZoom();
    resetPan();
  }, [onResetZoom, resetPan]);
  // ─── Native scroll-snap gallery ──────────────────────────────────
  // Every photo is a full-width snap page. The phone's own scrolling handles
  // swipe physics, so swipes can be interrupted and chained like a native
  // gallery. The visible page is synced back to the index once scrolling rests.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const indexRef = useRef(index);
  const zoomLevelRef = useRef(zoomLevel);
  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);

  const slideList = useMemo<LightboxImage[]>(
    () => (images && images.length > 0 ? images : currentImage ? [currentImage] : []),
    [images, currentImage]
  );

  const syncFromScroll = useCallback(() => {
    const el = scroller;
    if (!el || !el.clientWidth) return;
    const k = Math.max(0, Math.min(slideList.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
    const cur = indexRef.current;
    if (k === cur) return;
    const diff = k - cur;
    for (let i = 0; i < Math.abs(diff); i++) {
      if (diff > 0) onNext(); else onPrev();
    }
    indexRef.current = k;
  }, [scroller, slideList.length, onNext, onPrev]);

  useEffect(() => {
    if (!open || !scroller) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(syncFromScroll, 120);
    };
    const onEnd = () => {
      if (t) clearTimeout(t);
      syncFromScroll();
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onEnd);
    return () => {
      if (t) clearTimeout(t);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onEnd);
    };
  }, [open, scroller, syncFromScroll]);

  // Keep the scroller on the current photo when the index changes from
  // outside (keyboard, opening on a specific photo) without fighting a swipe.
  useLayoutEffect(() => {
    indexRef.current = index;
    if (!scroller) return;
    const w = scroller.clientWidth;
    if (!w) return;
    if (Math.round(scroller.scrollLeft / w) !== index) {
      scroller.scrollTo({ left: index * w, behavior: "auto" });
    }
    setPanOffset({ x: 0, y: 0 });
  }, [scroller, index]);

  // Full Screen toggles and phone rotation change the page width — re-pin
  // to the current photo so neighbours never peek in.
  useEffect(() => {
    if (!open || !scroller || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = scroller.clientWidth;
      if (w) scroller.scrollTo({ left: indexRef.current * w, behavior: "auto" });
    });
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [open, scroller, fullScreen]);

  // Pinch/two-finger detection: disable drag while a second touch is down.
  // Must be state (not a ref) so that clearing it re-renders and re-enables drag.
  const [pinching, setPinching] = useState(false);
  const pinchingRef = useRef(false);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);
  const twoFingerStart = useRef<{ x: number; y: number } | null>(null);
  const panOffsetRef = useRef(panOffset);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  const stageRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return () => {};
    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const getMidpoint = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchingRef.current = true;
        setPinching(true);
        pinchStartDist.current = getDistance(e.touches[0], e.touches[1]);
        pinchStartZoom.current = zoomLevelRef.current;
        twoFingerStart.current = getMidpoint(e.touches[0], e.touches[1]);
        panOrigin.current = { x: panOffsetRef.current.x, y: panOffsetRef.current.y };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / pinchStartDist.current;
        const newZoom = Math.min(3, Math.max(0.5, pinchStartZoom.current * scale));
        setZoomLevel(newZoom);
        if (twoFingerStart.current) {
          const mid = getMidpoint(e.touches[0], e.touches[1]);
          const dx = mid.x - twoFingerStart.current.x;
          const dy = mid.y - twoFingerStart.current.y;
          setPanOffset({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist.current = null;
        twoFingerStart.current = null;
        // small delay so framer-motion's drag doesn't grab the tail of pinch
        setTimeout(() => { pinchingRef.current = false; setPinching(false); }, 30);
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [setZoomLevel]);

  // Arrow buttons glide to the neighbouring photo using the same native paging.
  const commitNav = useCallback(
    (dir: "next" | "prev") => {
      if (!scroller || slideList.length < 2) {
        if (dir === "next") onNext(); else onPrev();
        return;
      }
      const w = scroller.clientWidth;
      const cur = Math.round(scroller.scrollLeft / w);
      const n = slideList.length;
      const target = ((cur + (dir === "next" ? 1 : -1)) % n + n) % n;
      scroller.scrollTo({ left: target * w, behavior: prefersReducedMotion ? "auto" : "smooth" });
    },
    [scroller, slideList.length, onNext, onPrev, prefersReducedMotion]
  );

  const canSwipe = count > 1 && zoomLevel <= 1.01 && !pinching;

  return (
    <>
      <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-card-lightbox
          onInteractOutside={(event) => {
            if ((event.target as HTMLElement)?.closest?.("[data-share-fab]")) event.preventDefault();
          }}
          className={
            fullScreen
              ? "max-w-none w-screen h-[100dvh] p-0 gap-0 bg-black border-0 rounded-none translate-x-0 translate-y-0 left-0 top-0 sm:rounded-none"
              : "max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-border/30"
          }
        >
          <div className="relative flex h-full w-full flex-col overflow-hidden">
            {/* Close button */}
            {fullScreen ? (
              <button
                type="button"
                onClick={() => setFullScreen(false)}
                aria-label="Exit full screen"
                className="absolute top-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <CloseButton3D
                variant="prominent"
                onClick={onClose}
                className="absolute top-4 right-4 z-20"
                label="Close lightbox"
              />
            )}

            {/* Reset + Download + Share controls */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleResetZoom}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full" aria-label="Reset zoom">
                1:1
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full" aria-label="Download image">
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full" aria-label="Share image">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { handleResetZoom(); setFullScreen((v) => !v); }}
                aria-label={fullScreen ? "Exit full screen" : "Full screen"}
                title={fullScreen ? "Exit full screen" : "Full screen"}
                className={
                  "rounded-full text-white " +
                  (fullScreen
                    ? "bg-black/60 hover:bg-black/80"
                    : isLandscape
                      ? "bg-primary/25 hover:bg-primary/40 ring-1 ring-primary/50"
                      : "bg-black/60 hover:bg-black/80")
                }
              >
                {fullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>


            {/* Navigation arrows — use commitNav so buttons feel identical to swipes */}
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => commitNav("prev")}
                  className="absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80 active:scale-95"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => commitNav("next")}
                  className="absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80 active:scale-95"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Stage — pinch/zoom via native touch listeners; one-finger swiping is
                handled by the phone's own scroll-snap paging, like a native gallery. */}
            <div ref={stageRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
              <div
                ref={setScroller}
                data-lightbox-scroller
                className="flex h-full w-full snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  overflowX: canSwipe ? "auto" : "hidden",
                  overflowY: "hidden",
                  touchAction: canSwipe ? "pan-x pan-y" : "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {slideList.map((img, i) => (
                  <div
                    key={`${i}-${img.url}`}
                    className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center"
                  >
                    {Math.abs(i - index) <= 2 ? (
                      <LightboxSlide
                        image={img}
                        panOffset={i === index ? panOffset : { x: 0, y: 0 }}
                        zoomLevel={i === index ? zoomLevel : 1}
                        isActive={i === index}
                        fullScreen={fullScreen}
                        onDimensions={i === index ? ({ width, height }) => setAspect(width / height) : undefined}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>


            {/* Floating counter pill in full-screen gallery mode */}
            {fullScreen && count > 1 && (
              <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-black/55 px-3.5 py-1 text-xs font-medium text-white/85 backdrop-blur-md">
                {index + 1} / {count}
              </div>
            )}

            {/* Dedicated caption area below the image — never overlays photo content. */}
            {!fullScreen && (
            <div className="relative z-[60] flex w-full shrink-0 flex-col items-center gap-1 border-t border-border/30 bg-black/95 px-4 py-3">
              {(currentImage?.shareText || currentImage?.alt || currentImage?.description || currentImage?.srp) && (
                <div className="w-full max-w-lg space-y-0 text-center max-h-[32vh] overflow-y-auto">
                  {(currentImage?.shareText || currentImage?.alt) && (
                    <h3 className="text-white font-semibold text-base px-4 pb-1">
                      {currentImage?.shareText || currentImage?.alt}
                    </h3>
                  )}
                  {currentImage?.srp && (
                    <p className="text-amber-300 font-semibold text-sm px-4 py-1">
                      SRP {currentImage.srp}
                    </p>
                  )}
                  {currentImage?.description && currentImage.description !== (currentImage?.shareText || currentImage?.alt) && (
                    <p className="text-white/90 text-sm leading-relaxed px-4 pt-1">
                      {currentImage.description}
                    </p>
                  )}
                </div>
              )}
              {count > 1 && (
                <div className="text-white/80 px-4 py-1 text-sm">
                  {index + 1} / {count}
                </div>
              )}
            </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {currentImage && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          imageUrls={[currentImage.url]}
          publicCardUrl={shareUrl || ""}
          title={currentImage.alt || "Image from Card-Ex"}
          text={currentImage.shareText || "Check out this image from Card-Ex"}
        />
      )}
    </>
  );
}
