import React, { useCallback, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";
import { shareAllImages, downloadAllAsZip, isMobileDevice, type CarouselKind } from "@/lib/share";
import ShareModal from "@/components/carousel/ShareModal";
import ImageSelectionDialog from "@/components/carousel/ImageSelectionDialog";

export interface CarouselShareHeaderProps {
  carouselKind: CarouselKind;
  imageUrls: string[];
  shareEnabled?: boolean;
  shareAllEnabled?: boolean;
  /** The PUBLIC card URL - must be https://tagex.app/c/{slug}, never editor URL */
  shareUrl?: string;
  /** The card slug for building share page URL */
  cardSlug?: string;
  title?: string;
  className?: string;
  onShareEvent?: (type: "share_all" | "download_all") => void;
}

// Max images that can be shared via native share
const MAX_NATIVE_SHARE_IMAGES = 10;

export default function CarouselShareHeader({
  carouselKind,
  imageUrls,
  shareEnabled = true,
  shareAllEnabled = true,
  shareUrl,
  cardSlug,
  title,
  className = "",
  onShareEvent,
}: CarouselShareHeaderProps) {
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [imageSelectionOpen, setImageSelectionOpen] = useState(false);
  const [downloadSelectionOpen, setDownloadSelectionOpen] = useState(false);
  
  // Persist selections between dialog opens
  const [shareSelection, setShareSelection] = useState<Set<number>>(new Set());
  const [downloadSelection, setDownloadSelection] = useState<Set<number>>(new Set());
  
  const kindLabel = carouselKind.charAt(0).toUpperCase() + carouselKind.slice(1);
  const displayTitle = title || kindLabel;

  // Prepare images for selection dialog
  const selectableImages = useMemo(() => 
    imageUrls.map((url, idx) => ({ url, alt: `${kindLabel} ${idx + 1}` })),
    [imageUrls, kindLabel]
  );

  // Actually perform the share with selected images
  const doShare = useCallback(async (urlsToShare: string[]) => {
    if (urlsToShare.length === 0) return;

    const result = await shareAllImages({
      imageUrls: urlsToShare,
      carouselKind,
      title: `${displayTitle} from Card-Ex`,
      text: `Check out these ${urlsToShare.length} ${kindLabel.toLowerCase()} images!`,
      url: shareUrl,
    });

    if (result.ok) {
      onShareEvent?.("share_all");
    } else if (result.showModal) {
      // Check if we're on mobile - on mobile, show modal instead of navigating to share page
      if (isMobileDevice()) {
        setShareModalOpen(true);
      } else {
        // On desktop, navigate to dedicated share page if slug available
        if (cardSlug) {
          navigate(`/c/${cardSlug}/share/${carouselKind}`);
        } else {
          setShareModalOpen(true);
        }
      }
    }
  }, [carouselKind, displayTitle, kindLabel, shareUrl, onShareEvent, cardSlug, navigate]);

  // Handle share button click - show selection dialog
  const handleShareAll = useCallback(async () => {
    if (!shareAllEnabled || imageUrls.length === 0) return;
    setImageSelectionOpen(true);
  }, [imageUrls.length, shareAllEnabled]);

  // Callback when user confirms image selection for sharing
  const handleImageSelectionConfirm = useCallback((selectedUrls: string[]) => {
    doShare(selectedUrls);
  }, [doShare]);

  // Handle download button click - show selection dialog (unlimited)
  const handleDownloadAll = useCallback(() => {
    if (imageUrls.length === 0) return;
    setDownloadSelectionOpen(true);
  }, [imageUrls.length]);

  // Callback when user confirms image selection for download
  const handleDownloadSelectionConfirm = useCallback(async (selectedUrls: string[]) => {
    if (selectedUrls.length === 0) return;

    const result = await downloadAllAsZip({
      imageUrls: selectedUrls,
      carouselKind,
    });

    if (result.ok) {
      onShareEvent?.("download_all");
    }
  }, [carouselKind, onShareEvent]);

  if (!shareEnabled || imageUrls.length === 0) {
    return null;
  }

  return (
    <>
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

        {/* Share */}
        <Button
          variant="default"
          size="sm"
          onClick={handleShareAll}
          className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 p-0 text-xs"
          aria-label="Share images"
        >
          <Share2 className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>

      {/* Image selection dialog for SHARE - shown when more than 10 images */}
      <ImageSelectionDialog
        open={imageSelectionOpen}
        onOpenChange={setImageSelectionOpen}
        images={selectableImages}
        maxSelection={MAX_NATIVE_SHARE_IMAGES}
        title={`Select ${kindLabel} to share`}
        onConfirm={handleImageSelectionConfirm}
        mode="share"
        previousSelection={shareSelection}
        onSelectionChange={setShareSelection}
      />

      {/* Image selection dialog for DOWNLOAD - unlimited selection */}
      <ImageSelectionDialog
        open={downloadSelectionOpen}
        onOpenChange={setDownloadSelectionOpen}
        images={selectableImages}
        title={`Select ${kindLabel} to download`}
        onConfirm={handleDownloadSelectionConfirm}
        mode="download"
        previousSelection={downloadSelection}
        onSelectionChange={setDownloadSelection}
      />


      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        imageUrls={imageUrls}
        publicCardUrl={shareUrl || ""}
        title={`${displayTitle} from Card-Ex`}
        text={`Check out these ${imageUrls.length} ${kindLabel.toLowerCase()} images!`}
      />
    </>
  );
}
