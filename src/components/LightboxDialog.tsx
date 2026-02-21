import React, { useCallback, useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, X, Download, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { shareSingleImage, downloadSingleImage } from "@/lib/share";
import ShareModal from "@/components/carousel/ShareModal";
import type { LightboxImage } from "@/hooks/useLightbox";

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
}

export default function LightboxDialog({
  open,
  onOpenChange,
  currentImage,
  index,
  count,
  zoomLevel,
  setZoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onNext,
  onPrev,
  onDownload,
  onClose,
  shareUrl,
}: LightboxDialogProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const panOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Download current image
  const handleDownload = useCallback(async () => {
    if (!currentImage?.url) return;
    await downloadSingleImage(currentImage.url);
    onDownload();
  }, [currentImage, onDownload]);

  // Share current image
  const handleShare = useCallback(async () => {
    if (!currentImage?.url) return;
    const result = await shareSingleImage({
      imageUrl: currentImage.url,
      title: currentImage.alt || "Check out this image!",
      text: currentImage.shareText || "Check out this image from Card-Ex",
      url: shareUrl,
    });
    if (result.showModal) {
      setShareModalOpen(true);
    }
  }, [currentImage, shareUrl]);

  const panContainerRef = useRef<HTMLDivElement>(null);
  const resetPan = useCallback(() => setPanOffset({ x: 0, y: 0 }), []);

  // Reset zoom + pan together
  const handleResetZoom = useCallback(() => {
    onResetZoom();
    resetPan();
  }, [onResetZoom, resetPan]);

  const handleZoomOut = useCallback(() => {
    onZoomOut();
    if (zoomLevel <= 1.5) resetPan();
  }, [onZoomOut, zoomLevel, resetPan]);

  // Refs so native event listeners always see the latest values
  const zoomLevelRef = useRef(zoomLevel);
  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);

  const panOffsetRef = useRef(panOffset);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  // Track pinch-to-zoom gesture
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);

  // Attach native (non-passive) touch listeners for both pinch-zoom and single-finger pan
  useEffect(() => {
    const el = panContainerRef.current;
    if (!el) return;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      // 2-finger pinch start
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStartDist.current = getDistance(e.touches[0], e.touches[1]);
        pinchStartZoom.current = zoomLevelRef.current;
        panStart.current = null; // cancel any pan
        return;
      }
      // 1-finger pan start (only when zoomed)
      if (e.touches.length === 1 && zoomLevelRef.current > 1) {
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panOrigin.current = { x: panOffsetRef.current.x, y: panOffsetRef.current.y };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // 2-finger pinch zoom
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / pinchStartDist.current;
        const newZoom = Math.min(3, Math.max(0.5, pinchStartZoom.current * scale));
        setZoomLevel(newZoom);
        return;
      }
      // 1-finger pan (only when zoomed)
      if (e.touches.length === 1 && zoomLevelRef.current > 1 && panStart.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        setPanOffset({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist.current = null;
      }
      if (e.touches.length === 0) {
        panStart.current = null;
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
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-border/30">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Zoom + Download + Share controls */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetZoom}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                aria-label="Reset zoom"
              >
                1:1
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onZoomIn}
                disabled={zoomLevel >= 3}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                aria-label="Download image"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                aria-label="Share image"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation arrows */}
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={onPrev}
                  className="absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80 active:scale-95"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80 active:scale-95"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image — touch pan with 1 finger when zoomed (native listeners attached via ref) */}
            <div
              ref={panContainerRef}
              className="w-full h-full flex items-center justify-center p-8 overflow-hidden"
              style={{ touchAction: "none" }}
            >
              {currentImage && (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt ?? ""}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                  }}
                  draggable={false}
                />
              )}
            </div>

            {/* Image counter */}
            {count > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                {index + 1} / {count}
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
