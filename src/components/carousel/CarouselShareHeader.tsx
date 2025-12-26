import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download, Link2 } from "lucide-react";
import { shareAllImages, downloadAllAsZip, type CarouselKind } from "@/lib/share";
import { toast } from "@/hooks/use-toast";

export interface CarouselShareHeaderProps {
  carouselKind: CarouselKind;
  imageUrls: string[];
  shareEnabled?: boolean;
  shareAllEnabled?: boolean;
  shareUrl?: string;
  title?: string;
  className?: string;
  onShareEvent?: (type: "share_all" | "download_all" | "copy_link") => void;
}

export default function CarouselShareHeader({
  carouselKind,
  imageUrls,
  shareEnabled = true,
  shareAllEnabled = true,
  shareUrl,
  title,
  className = "",
  onShareEvent,
}: CarouselShareHeaderProps) {
  const kindLabel = carouselKind.charAt(0).toUpperCase() + carouselKind.slice(1);
  const displayTitle = title || kindLabel;

  const handleShareAll = useCallback(async () => {
    if (!shareAllEnabled || imageUrls.length === 0) return;

    const result = await shareAllImages({
      imageUrls,
      carouselKind,
      title: `${displayTitle} from Card-Ex`,
      text: `Check out these ${imageUrls.length} ${kindLabel.toLowerCase()} images!`,
      url: shareUrl || window.location.href,
    });

    if (result.ok) {
      onShareEvent?.("share_all");
    }
  }, [imageUrls, carouselKind, displayTitle, kindLabel, shareUrl, shareAllEnabled, onShareEvent]);

  const handleDownloadAll = useCallback(async () => {
    if (imageUrls.length === 0) return;

    const result = await downloadAllAsZip({
      imageUrls,
      carouselKind,
    });

    if (result.ok) {
      onShareEvent?.("download_all");
    }
  }, [imageUrls, carouselKind, onShareEvent]);

  const handleCopyLink = useCallback(async () => {
    const url = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Share this link to show your card.",
      });
      onShareEvent?.("copy_link");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually.",
        variant: "destructive",
      });
    }
  }, [shareUrl, onShareEvent]);

  if (!shareEnabled || imageUrls.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 sm:gap-2 ${className}`}>
      {/* Copy Link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyLink}
        className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 p-0 text-xs bg-background/50 hover:bg-background/80 backdrop-blur-sm"
        aria-label="Copy link"
      >
        <Link2 className="h-3.5 w-3.5 sm:mr-1.5" />
        <span className="hidden sm:inline">Copy Link</span>
      </Button>

      {/* Download All */}
      {imageUrls.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadAll}
          className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 p-0 text-xs bg-background/50 hover:bg-background/80 backdrop-blur-sm"
          aria-label="Download all images"
        >
          <Download className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Download All</span>
        </Button>
      )}

      {/* Share All */}
      {shareAllEnabled && (
        <Button
          variant="default"
          size="sm"
          onClick={handleShareAll}
          className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 p-0 text-xs"
          aria-label="Share all images"
        >
          <Share2 className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Share {imageUrls.length > 1 ? "All" : ""}</span>
        </Button>
      )}
    </div>
  );
}
