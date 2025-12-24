/**
 * Image compression utilities for reducing file sizes before upload
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  mimeType: "image/jpeg",
};

/**
 * Load an image from a File or Blob
 */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress an image file, returning a new Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; wasCompressed: boolean; originalSize: number; compressedSize: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Skip compression for SVGs and GIFs (they don't compress well with canvas)
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return { blob: file, wasCompressed: false, originalSize, compressedSize: originalSize };
  }

  try {
    const img = await loadImage(file);
    const { width, height } = img;

    // Calculate new dimensions maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (width > opts.maxWidth! || height > opts.maxHeight!) {
      const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
      newWidth = Math.round(width * ratio);
      newHeight = Math.round(height * ratio);
    }

    // If image is already small and file size is under 500KB, skip compression
    if (newWidth === width && newHeight === height && file.size < 500 * 1024) {
      return { blob: file, wasCompressed: false, originalSize, compressedSize: originalSize };
    }

    // Create canvas and draw resized image
    const canvas = document.createElement("canvas");
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        },
        opts.mimeType,
        opts.quality
      );
    });

    // If compressed is larger than original, return original
    if (blob.size >= file.size) {
      return { blob: file, wasCompressed: false, originalSize, compressedSize: originalSize };
    }

    return {
      blob,
      wasCompressed: true,
      originalSize,
      compressedSize: blob.size,
    };
  } catch (error) {
    console.error("Compression failed, using original:", error);
    return { blob: file, wasCompressed: false, originalSize, compressedSize: originalSize };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Create a preview URL from a File
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
