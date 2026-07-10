/**
 * Single source of truth for image sizes across TagEx / Card-Ex.
 *
 * Rules:
 * - Uploaders resize to at most UPLOAD_PRESETS[kind] before hitting Storage.
 * - Renderers request exactly one of RENDER_PRESETS[kind][variant] — no
 *   arbitrary widths / heights, ever.
 * - This keeps the number of distinct Supabase image-transform URLs bounded,
 *   which is what actually drives cost at scale.
 */

export type ImageKind =
  | "avatar"
  | "logo"
  | "cover"
  | "carousel"
  | "product"
  | "package"
  | "testimony"
  | "branch";

export type RenderVariant = "default" | "thumb";

export interface Size {
  width: number;
  height: number;
}

/** Maximum dimensions of the optimized original that gets uploaded. */
export const UPLOAD_PRESETS: Record<ImageKind, Size> = {
  avatar:    { width: 600,  height: 600 },
  logo:      { width: 600,  height: 600 },
  cover:     { width: 1920, height: 1080 },
  carousel:  { width: 1600, height: 1600 },
  product:   { width: 1600, height: 1600 },
  package:   { width: 1600, height: 1600 },
  testimony: { width: 1600, height: 1600 },
  branch:    { width: 1600, height: 1600 },
};

/** Hard byte cap after optimization (rejects the upload if exceeded). */
export const UPLOAD_MAX_BYTES: Record<ImageKind, number> = {
  avatar:    400 * 1024,       // 400 KB
  logo:      400 * 1024,
  cover:     900 * 1024,       // 900 KB
  carousel:  900 * 1024,
  product:   900 * 1024,
  package:   900 * 1024,
  testimony: 900 * 1024,
  branch:    900 * 1024,
};

/**
 * Sizes actually requested from the Supabase image-transform CDN.
 * `thumb` = 150² admin thumbnail. `default` = the on-card render size.
 * Any renderer that needs a different logical size still uses one of these —
 * CSS scales the result.
 */
export const RENDER_PRESETS: Record<ImageKind, Record<RenderVariant, Size>> = {
  avatar:    { default: { width: 300,  height: 300 },  thumb: { width: 150, height: 150 } },
  logo:      { default: { width: 300,  height: 300 },  thumb: { width: 150, height: 150 } },
  cover:     { default: { width: 1600, height: 900 },  thumb: { width: 150, height: 150 } },
  carousel:  { default: { width: 1200, height: 1200 }, thumb: { width: 150, height: 150 } },
  product:   { default: { width: 1200, height: 1200 }, thumb: { width: 150, height: 150 } },
  package:   { default: { width: 1200, height: 1200 }, thumb: { width: 150, height: 150 } },
  testimony: { default: { width: 1200, height: 1200 }, thumb: { width: 150, height: 150 } },
  branch:    { default: { width: 1200, height: 1200 }, thumb: { width: 150, height: 150 } },
};

/** JPEG/WebP encoder quality used by the pre-upload optimizer. */
export const UPLOAD_QUALITY = 0.82;

/** Cache-Control set on every upload. Immutable is safe because we use
 *  content-hash filenames. */
export const IMMUTABLE_CACHE_CONTROL = "31536000, immutable";
