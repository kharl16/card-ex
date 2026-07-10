/**
 * Browser-side image optimizer. Runs BEFORE upload so nothing raw ever hits
 * Supabase Storage.
 *
 * - Decoding via createImageBitmap drops EXIF metadata as a side effect.
 * - Resizes to the preset max keeping aspect ratio.
 * - Encodes WebP by default; keeps PNG only when the source has real
 *   transparency; falls back to JPEG for other rasters when WebP is
 *   unavailable.
 * - Content-hashes the encoded bytes so identical uploads dedupe in Storage.
 */

import {
  UPLOAD_PRESETS,
  UPLOAD_MAX_BYTES,
  UPLOAD_QUALITY,
  type ImageKind,
} from "./presets";

export interface OptimizedImage {
  blob: Blob;
  mime: "image/webp" | "image/jpeg" | "image/png";
  extension: "webp" | "jpg" | "png";
  width: number;
  height: number;
  /** Object URL — caller is responsible for revoking after use. */
  previewUrl: string;
  /** SHA-256 hex of the encoded bytes; use as the storage filename. */
  contentHash: string;
  originalBytes: number;
  optimizedBytes: number;
}

export interface OptimizeOptions {
  kind: ImageKind;
  /** Force keeping transparency check off (e.g. always JPEG). */
  forceOpaque?: boolean;
}

const WEBP_SUPPORTED: boolean = (() => {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("Could not decode image"));
    };
    img.src = objUrl;
  });
}

function pickDimensions(sw: number, sh: number, maxW: number, maxH: number) {
  const r = Math.min(1, maxW / sw, maxH / sh);
  return { width: Math.round(sw * r), height: Math.round(sh * r) };
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  // Sample a small grid rather than the full image for speed.
  const step = Math.max(1, Math.floor(Math.min(w, h) / 20));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const alpha = ctx.getImageData(x, y, 1, 1).data[3];
      if (alpha < 255) return true;
    }
  }
  return false;
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas encode failed"))),
      mime,
      quality
    );
  });
}

export async function optimizeForUpload(
  file: File | Blob,
  { kind, forceOpaque }: OptimizeOptions
): Promise<OptimizedImage> {
  const preset = UPLOAD_PRESETS[kind];
  const originalBytes = file.size;

  const bitmap = await decode(file);
  const sw = "width" in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
  const sh = "height" in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight;

  const { width, height } = pickDimensions(sw, sh, preset.width, preset.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

  const isPng = (file as File).type === "image/png";
  const keepAlpha = !forceOpaque && isPng && hasTransparency(ctx, width, height);

  let mime: OptimizedImage["mime"];
  let extension: OptimizedImage["extension"];
  let blob: Blob;

  if (keepAlpha) {
    mime = "image/png";
    extension = "png";
    blob = await encodeCanvas(canvas, "image/png", 1);
  } else if (WEBP_SUPPORTED) {
    mime = "image/webp";
    extension = "webp";
    blob = await encodeCanvas(canvas, "image/webp", UPLOAD_QUALITY);
  } else {
    mime = "image/jpeg";
    extension = "jpg";
    blob = await encodeCanvas(canvas, "image/jpeg", UPLOAD_QUALITY);
  }

  const maxBytes = UPLOAD_MAX_BYTES[kind];
  if (blob.size > maxBytes) {
    throw new Error(
      `Optimized image is still ${(blob.size / 1024).toFixed(0)} KB (limit ${
        maxBytes / 1024
      } KB for ${kind}). Try a smaller source image.`
    );
  }

  const contentHash = await sha256Hex(blob);
  const previewUrl = URL.createObjectURL(blob);

  if ("close" in bitmap && typeof (bitmap as ImageBitmap).close === "function") {
    (bitmap as ImageBitmap).close();
  }

  return {
    blob,
    mime,
    extension,
    width,
    height,
    previewUrl,
    contentHash,
    originalBytes,
    optimizedBytes: blob.size,
  };
}
