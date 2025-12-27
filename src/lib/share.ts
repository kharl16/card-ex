import JSZip from "jszip";
import { toast } from "@/hooks/use-toast";

export type CarouselKind = "products" | "packages" | "testimonies";

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
}

// Check if Web Share API supports file sharing
function canShareFiles(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    "canShare" in navigator
  );
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
 * Share a single image via native share or clipboard fallback
 */
export async function shareSingleImage(opts: ShareSingleOptions): Promise<ShareResult> {
  const { imageUrl, filenameHint, title = "Check this out!", text = "", url } = opts;

  // Try Web Share API with file
  if (canShareFiles()) {
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

  // Fallback: Try sharing just the URL
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title,
        text: text || "Check out this image",
        url: imageUrl,
      });
      return { ok: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
      console.warn("Web Share URL fallback failed:", error);
    }
  }

  // Final fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(imageUrl);
    toast({
      title: "Link copied!",
      description: "Paste it into Messenger, Facebook, WhatsApp, or any app.",
    });
    return { ok: true, reason: "clipboard" };
  } catch (error) {
    console.error("Clipboard fallback failed:", error);
    // Ultimate fallback: open in new tab
    window.open(imageUrl, "_blank");
    toast({
      title: "Image opened in new tab",
      description: "You can save or share it from there.",
    });
    return { ok: true, reason: "newtab" };
  }
}

/**
 * Share all images in a carousel as a ZIP
 * If Web Share with files is not supported, automatically downloads the ZIP instead
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

  // Try creating a ZIP and sharing via Web Share
  if (canShareFiles()) {
    try {
      toast({
        title: "Preparing images...",
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
      const zipFile = new File([zipBlob], zipFilename, { type: "application/zip" });

      const shareData: ShareData = {
        title,
        text,
        files: [zipFile],
      };

      // Add the public URL if provided
      if (url) {
        shareData.url = url;
      }

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { ok: true };
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
      console.warn("ZIP share failed, falling back to download:", error);
    }
  }

  // Fallback: Download the ZIP instead (works on all platforms)
  toast({
    title: "Sharing not supported",
    description: "Downloading ZIP file instead...",
  });
  
  return downloadAllAsZip({ imageUrls, carouselKind });
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
