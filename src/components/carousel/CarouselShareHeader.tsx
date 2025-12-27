import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";
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
  onShareEvent?: (type: "share_all" | "download_all") => void;
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

  // Share All: try Web Share with ZIP, fallback to download
  const handleShareAll = useCallback(async () => {
    if (!shareAllEnabled || imageUrls.length === 0) return;

    const result = await shareAllImages({
      imageUrls,
      carouselKind,
      title: `${displayTitle} from Card-Ex`,
      text: `Check out these ${imageUrls.length} ${kindLabel.toLowerCase()} images!`,
      url: shareUrl,
    });

    if (result.ok) {
      onShareEvent?.("share_all");
    }
  }, [imageUrls, carouselKind, displayTitle, kindLabel, shareUrl, shareAllEnabled, onShareEvent]);

  // Download All: always download as ZIP
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

  if (!shareEnabled || imageUrls.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 sm:gap-2 ${className}`}>
      {/* Download All */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownloadAll}
        className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 p-0 text-xs bg-background/50 hover:bg-background/80 backdrop-blur-sm"
        aria-label="Download all images"
      >
        <Download className="h-3.5 w-3.5 sm:mr-1.5" />
        <span className="hidden sm:inline">Download</span>
      </Button>

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
          <span className="hidden sm:inline">Share All</span>
        </Button>
      )}
    </div>
  );
}
