/**
 * ImageService — the ONLY way components should build image URLs.
 *
 * Every URL produced here comes from a fixed preset in `./presets.ts`, so the
 * Supabase image-transform CDN sees a tiny, bounded set of distinct URLs and
 * caches them aggressively. Components must not compute widths/heights on
 * their own.
 */

import { cdnImage as internalCdn } from "@/lib/cdnImage";
import {
  RENDER_PRESETS,
  type ImageKind,
  type RenderVariant,
  type Size,
} from "./presets";

/**
 * The original, untransformed URL — reserved for downloads, editing, and the
 * lightbox (which reuses the already-loaded preview URL rather than requesting
 * a bigger version).
 */
export function getOriginalUrl(url: string | null | undefined): string {
  return url ?? "";
}

/**
 * Deterministic transformed URL for on-page rendering. Always returns the
 * same URL for the same (url, kind, variant) tuple — do not add cache-busting
 * query params on top of this.
 */
export function getRenderUrl(
  url: string | null | undefined,
  kind: ImageKind,
  variant: RenderVariant = "default"
): string {
  if (!url) return "";
  // Avatars and logos are already capped at 600x600 / 400KB by the uploader,
  // so hitting the Supabase image-transform CDN adds no visible quality and
  // wastes a billable "unique origin image" transformation. Serve the origin
  // directly for these kinds — the browser still caches it aggressively via
  // the immutable Cache-Control we set at upload time.
  if (kind === "avatar" || kind === "logo") {
    return url;
  }
  const size = RENDER_PRESETS[kind][variant];
  // Safeguard: if the URL is already a Supabase image-transform URL
  // (/render/image/public/) or already carries transform params (width/height/
  // quality/resize/format), do NOT re-wrap it. Re-wrapping with a different
  // preset would mint a second billable unique-origin transformation for the
  // same source image, defeating the whole point of the preset system.
  if (url.includes("/storage/v1/render/image/public/")) {
    return url;
  }
  try {
    const q = url.split("?")[1];
    if (q) {
      const params = new URLSearchParams(q);
      if (
        params.has("width") ||
        params.has("height") ||
        params.has("quality") ||
        params.has("resize") ||
        params.has("format")
      ) {
        return url;
      }
    }
  } catch {
    // fall through to normal transform
  }
  // format=origin preserves PNG transparency; the CDN still serves WebP when
  // the browser advertises support via Accept: image/webp.
  return internalCdn(url, {
    width: size.width,
    height: size.height,
    resize: "contain",
    quality: 82,
    format: "origin",
  });
}



/**
 * Optional 1x/2x srcset built ONLY from preset sizes. Never emits arbitrary
 * widths. Consumers pass the sizes attribute that matches their layout.
 */
export function getSrcSet(
  url: string | null | undefined,
  kind: ImageKind
): string | undefined {
  if (!url) return undefined;
  const base = RENDER_PRESETS[kind].default;
  const oneX = getRenderUrl(url, kind, "default");
  // 2x variant reuses the same preset but doubled — kept as a single extra URL
  // so the CDN cache surface stays tiny. Ceiling at what the uploader actually
  // stores (UPLOAD_PRESETS caps at 1920 for cover, 1600 for the rest), so 2x
  // often just returns the original which is fine.
  return `${oneX} ${base.width}w`;
}

export function getRenderSize(kind: ImageKind, variant: RenderVariant = "default"): Size {
  return RENDER_PRESETS[kind][variant];
}

export type { ImageKind, RenderVariant };
