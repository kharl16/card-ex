import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, X, Download, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import type { LightboxImage } from "@/hooks/useLightbox";

export interface LightboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage?: LightboxImage;
  index: number;
  count: number;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDownload: () => void;
  onClose: () => void;
  onShare?: () => void;
  shareEnabled?: boolean;
}

export default function LightboxDialog({
  open,
  onOpenChange,
  currentImage,
  index,
  count,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onNext,
  onPrev,
  onDownload,
  onClose,
  onShare,
  shareEnabled = true,
}: LightboxDialogProps) {
  return (
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
              onClick={onZoomOut}
              disabled={zoomLevel <= 0.5}
              className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onResetZoom}
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
            {/* Download button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDownload}
              className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              aria-label="Download image"
            >
              <Download className="h-5 w-5" />
            </Button>
            {/* Share button */}
            {shareEnabled && onShare && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                aria-label="Share this image"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation arrows in lightbox */}
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

          {/* Image */}
          <div className="w-full h-full overflow-auto flex items-center justify-center p-8">
            {currentImage && (
              <img
                src={currentImage.url}
                alt={currentImage.alt ?? ""}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
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
  );
}
