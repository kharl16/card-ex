import { useState, useCallback, useEffect } from "react";

export interface LightboxImage {
  url: string;
  alt?: string;
  shareText?: string;
}

export interface UseLightboxOptions {
  images: LightboxImage[];
  enabled?: boolean;
  onDownload?: (index: number) => void;
  onOpen?: (index: number) => void;
  onClose?: (index: number) => void;
}

export interface UseLightboxResult {
  lightboxOpen: boolean;
  lightboxIndex: number;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  setLightboxOpen: (open: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  nextImage: () => void;
  prevImage: () => void;
  handleDownload: () => Promise<void>;
  currentImage: LightboxImage | undefined;
  count: number;
}

export function useLightbox({
  images,
  enabled = true,
  onDownload,
  onOpen,
  onClose,
}: UseLightboxOptions): UseLightboxResult {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const count = images.length;
  const currentImage = images[lightboxIndex];

  const openLightbox = useCallback(
    (index: number) => {
      if (!enabled) return;
      setLightboxIndex(index);
      setLightboxOpen(true);
      setZoomLevel(1);
      onOpen?.(index);
    },
    [enabled, onOpen]
  );

  const closeLightbox = useCallback(() => {
    const currentIndex = lightboxIndex;
    setLightboxOpen(false);
    setZoomLevel(1);
    onClose?.(currentIndex);
  }, [lightboxIndex, onClose]);

  const zoomIn = useCallback(() => setZoomLevel((prev) => Math.min(prev + 0.5, 3)), []);
  const zoomOut = useCallback(() => setZoomLevel((prev) => Math.max(prev - 0.5, 0.5)), []);
  const resetZoom = useCallback(() => setZoomLevel(1), []);

  const nextImage = useCallback(() => {
    if (count === 0) return;
    setLightboxIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prevImage = useCallback(() => {
    if (count === 0) return;
    setLightboxIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Download current lightbox image (fetch as blob → force download)
  const handleDownload = useCallback(async () => {
    const current = images[lightboxIndex];
    if (!current?.url) return;

    try {
      const response = await fetch(current.url, { mode: "cors" });
      if (!response.ok) {
        console.error("Failed to fetch image for download", response.status);
        window.open(current.url, "_blank");
        return;
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Try to infer filename & extension from the URL
      let filename = "cardex-image";
      try {
        const urlObj = new URL(current.url);
        const pathParts = urlObj.pathname.split("/");
        const lastPart = pathParts[pathParts.length - 1] || "";
        filename = lastPart || filename;
      } catch {
        // fallback keeps "cardex-image"
      }

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      onDownload?.(lightboxIndex);
    } catch (error) {
      console.error("Error downloading image:", error);
      // As a fallback, at least open the image in a new tab
      window.open(current.url, "_blank");
    }
  }, [images, lightboxIndex, onDownload]);

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
      if (e.key.toLowerCase() === "s") handleDownload();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, closeLightbox, nextImage, prevImage, zoomIn, zoomOut, resetZoom, handleDownload]);

  return {
    lightboxOpen,
    lightboxIndex,
    zoomLevel,
    setZoomLevel,
    openLightbox,
    closeLightbox,
    setLightboxOpen,
    zoomIn,
    zoomOut,
    resetZoom,
    nextImage,
    prevImage,
    handleDownload,
    currentImage,
    count,
  };
}
