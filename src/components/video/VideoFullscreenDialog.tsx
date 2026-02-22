import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { getEmbedUrl, getShareUrl, getDownloadUrl } from "@/lib/videoUtils";
import type { VideoItem } from "@/lib/videoUtils";
import { toast } from "sonner";

interface VideoFullscreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video?: VideoItem;
  index: number;
  count: number;
  onNext: () => void;
  onPrev: () => void;
}

export default function VideoFullscreenDialog({
  open,
  onOpenChange,
  video,
  index,
  count,
  onNext,
  onPrev,
}: VideoFullscreenDialogProps) {
  if (!video) return null;

  const embedUrl = getEmbedUrl(video.url, true);
  const shareLink = getShareUrl(video.url);
  const downloadLink = getDownloadUrl(video.url);

  const handleShare = async () => {
    const text = `🎬 ${video.title || "Check out this video!"}\n${shareLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title || "Video", url: shareLink });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDownload = () => {
    if (downloadLink) {
      window.open(downloadLink, "_blank");
    } else {
      // YouTube - just open the video page
      window.open(shareLink, "_blank");
      toast.info("YouTube videos can be viewed at the link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-border/30">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Controls */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            {downloadLink && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                aria-label="Download video"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              aria-label="Share video"
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
                aria-label="Previous video"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80 active:scale-95"
                aria-label="Next video"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Video player */}
          <div className="w-full h-full flex items-center justify-center p-8">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full max-w-4xl max-h-[80vh] rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title || "Video player"}
              />
            ) : (
              <div className="text-white text-center">
                <p>Unable to embed this video</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.open(video.url, "_blank")}
                >
                  Open in new tab
                </Button>
              </div>
            )}
          </div>

          {/* Counter */}
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
