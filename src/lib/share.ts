import JSZip from "jszip";
import { toast } from "@/hooks/use-toast";
import { getPublicCardUrl } from "@/lib/cardUrl";

export type CarouselKind = "products" | "packages" | "testimonies" | "videos";

export interface ShareSingleOptions {
  imageUrl: string;
  filenameHint?: string;
  title?: string;
  text?: string;
  url?: string;
}

export interface ShareAllOptions {
  imageUrls: string[];
  carouselKind: CarouselKind;
  title?: string;
  text?: string;
  url?: string;
}

export interface ShareResult {
  ok: boolean;
  reason?: string;
  /** If true, caller should open the ShareModal */
  showModal?: boolean;
  modalData?: {
    imageUrls: string[];
    publicCardUrl: string;
    title: string;
    text: string;
  };
}

// Check if we're on a mobile device (where native share is preferred)
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Check if Web Share API supports file sharing
export function canShareFiles(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    "canShare" in navigator
  );
}

// Check if we should use native file sharing
// On mobile: always use native share if available
// On desktop: only use native share for URL-only sharing (not file sharing, which opens Windows dialog)
export function shouldUseNativeFileShare(): boolean {
  // Only use native file sharing on mobile devices
  // Desktop will fall back to ShareModal/SharePage for better UX
  return canShareFiles() && isMobileDevice();
}

// Fetch image as blob
async function fetchImageAsBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return null;
  }
}

// Get filename from URL
function getFilenameFromUrl(url: string, fallback = "image"): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes(".")) {
      return lastPart;
    }
  } catch {
    // ignore
  }
  return `${fallback}.jpg`;
}

// Get MIME type from filename/blob
function getMimeType(blob: Blob, filename: string): string {
  if (blob.type && blob.type.startsWith("image/")) {
    return blob.type;
  }
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/jpeg";
  }
}

/**
 * Share a single image via native share.
 * If Web Share isn't supported, returns showModal: true so caller can open ShareModal.
 */
export async function shareSingleImage(opts: ShareSingleOptions): Promise<ShareResult> {
  const { imageUrl, filenameHint, title = "Check this out!", text = "", url } = opts;

  // Try Web Share API with file
  if (shouldUseNativeFileShare()) {
    try {
      const blob = await fetchImageAsBlob(imageUrl);
      if (blob) {
        const filename = filenameHint || getFilenameFromUrl(imageUrl);
        const mimeType = getMimeType(blob, filename);
        const file = new File([blob], filename, { type: mimeType });

        const shareData: ShareData = {
          title,
          text,
          files: [file],
        };

        // Add URL if provided
        if (url) {
          shareData.url = url;
        }

        // Check if device can share this data
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return { ok: true };
        }
      }
    } catch (error: unknown) {
      // User cancelled or share failed - check if it was a cancel
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
      console.warn("Web Share with file failed, trying fallback:", error);
    }
  }

  // Fallback: Try sharing just the URL (no file)
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title,
        text: text || "Check out this image",
        url: url || imageUrl,
      });
      return { ok: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
      console.warn("Web Share URL fallback failed:", error);
    }
  }

  // Web Share not available - signal to open ShareModal
  return {
    ok: false,
    reason: "no_share_api",
    showModal: true,
    modalData: {
      imageUrls: [imageUrl],
      publicCardUrl: url || imageUrl,
      title,
      text: text || "Check out this image",
    },
  };
}

/**
 * Share all images in a carousel.
 * Uses Web Share API if available, otherwise returns showModal: true so caller can open ShareModal.
 */
export async function shareAllImages(opts: ShareAllOptions): Promise<ShareResult> {
  const { imageUrls, carouselKind, title = "Check out these images!", text = "", url } = opts;

  if (imageUrls.length === 0) {
    return { ok: false, reason: "no_images" };
  }

  // Single image? Just share directly
  if (imageUrls.length === 1) {
    return shareSingleImage({
      imageUrl: imageUrls[0],
      title,
      text,
      url,
    });
  }

  // Try Web Share API with multiple image files on mobile
  if (shouldUseNativeFileShare()) {
    try {
      // Limit to first 10 images for native share to avoid hitting system limits
      // Most devices struggle with more than 10 large image files
      const maxImagesForNativeShare = 10;
      const imagesToShare = imageUrls.slice(0, maxImagesForNativeShare);
      const totalImages = imageUrls.length;
      
      toast({
        title: "Preparing images...",
        description: `Preparing ${imagesToShare.length}${totalImages > maxImagesForNativeShare ? ` of ${totalImages}` : ""} images to share`,
      });

      // Fetch all images as files
      const files: File[] = [];
      const fetchPromises = imagesToShare.map(async (imgUrl, index) => {
        const blob = await fetchImageAsBlob(imgUrl);
        if (blob) {
          const filename = getFilenameFromUrl(imgUrl, `${carouselKind}-${index + 1}`);
          const mimeType = getMimeType(blob, filename);
          files.push(new File([blob], filename, { type: mimeType }));
        }
      });

      await Promise.all(fetchPromises);

      if (files.length === 0) {
        throw new Error("No images could be fetched");
      }

      const shareData: ShareData = {
        title,
        text: totalImages > maxImagesForNativeShare 
          ? `${text} (Showing ${files.length} of ${totalImages} images)`
          : text,
        files,
      };

      // Add the public URL if provided
      if (url) {
        shareData.url = url;
      }

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { ok: true };
      } else {
        // canShare returned false - try with fewer files
        console.warn("canShare returned false, trying with fewer images");
        
        // Try with just first 5 images
        if (files.length > 5) {
          const reducedFiles = files.slice(0, 5);
          const reducedShareData: ShareData = {
            title,
            text: `${text} (Showing 5 of ${totalImages} images)`,
            files: reducedFiles,
          };
          if (url) reducedShareData.url = url;
          
          if (navigator.canShare(reducedShareData)) {
            await navigator.share(reducedShareData);
            return { ok: true };
          }
        }
        
        throw new Error("Device cannot share this many files");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
      console.warn("Web Share with files failed, trying URL fallback:", error);
    }
  }

  // Fallback: Try sharing just the URL (without files)
  // This works on both mobile and desktop
  if (typeof navigator !== "undefined" && "share" in navigator && url) {
    try {
      await navigator.share({
        title,
        text: text || `Check out these ${imageUrls.length} images!`,
        url,
      });
      return { ok: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
      console.warn("Web Share URL fallback failed:", error);
    }
  }

  // Web Share not available - signal to open ShareModal
  return {
    ok: false,
    reason: "no_share_api",
    showModal: true,
    modalData: {
      imageUrls,
      publicCardUrl: url || "",
      title,
      text: text || `Check out these ${imageUrls.length} images!`,
    },
  };
}

/**
 * Download all images as a ZIP file
 */
export async function downloadAllAsZip(opts: {
  imageUrls: string[];
  carouselKind: CarouselKind;
}): Promise<ShareResult> {
  const { imageUrls, carouselKind } = opts;

  if (imageUrls.length === 0) {
    return { ok: false, reason: "no_images" };
  }

  try {
    toast({
      title: "Preparing download...",
      description: `Creating ZIP of ${imageUrls.length} images`,
    });

    const zip = new JSZip();
    const folder = zip.folder(carouselKind) || zip;

    // Fetch all images in parallel
    const fetchPromises = imageUrls.map(async (imgUrl, index) => {
      const blob = await fetchImageAsBlob(imgUrl);
      if (blob) {
        const filename = getFilenameFromUrl(imgUrl, `image-${index + 1}`);
        folder.file(filename, blob);
      }
    });

    await Promise.all(fetchPromises);

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipFilename = `cardex-${carouselKind}.zip`;

    // Trigger download
    const blobUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    toast({
      title: "Download started!",
      description: `${zipFilename} is being downloaded.`,
    });

    return { ok: true };
  } catch (error) {
    console.error("ZIP download failed:", error);
    toast({
      title: "Download failed",
      description: "Could not create ZIP file. Try downloading images individually.",
      variant: "destructive",
    });
    return { ok: false, reason: "zip_failed" };
  }
}

/**
 * Download a single image
 */
export async function downloadSingleImage(imageUrl: string, filename?: string): Promise<ShareResult> {
  try {
    const blob = await fetchImageAsBlob(imageUrl);
    if (!blob) {
      throw new Error("Failed to fetch image");
    }

    const downloadFilename = filename || getFilenameFromUrl(imageUrl);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    return { ok: true };
  } catch (error) {
    console.error("Download failed:", error);
    toast({
      title: "Download failed",
      description: "Could not download image. Please try again.",
      variant: "destructive",
    });
    return { ok: false, reason: "download_failed" };
  }
}
