/**
 * Append Supabase Storage image-transform query params to a public Storage URL,
 * so the CDN serves a resized/optimized variant instead of the full original.
 *
 * Usage:
 *   <img src={cdnImage(url, { width: 800 })} />
 *
 * Notes:
 * - Only rewrites URLs that point at /storage/v1/object/public/. Anything else
 *   (external URLs, data URIs, blobs, SVG placeholders) is returned unchanged.
 * - Switches the path from /object/public/ to /render/image/public/, which is
 *   the Supabase image-transformation endpoint.
 * - `format=origin` keeps the original format (PNG stays PNG, JPG stays JPG)
 *   while still allowing resize + quality, which avoids surprises with
 *   transparency. Set `format: "webp"` to force WebP.
 */
export type CdnImageOptions = {
  width?: number;
  height?: number;
  quality?: number; // 20-100
  resize?: "cover" | "contain" | "fill";
  format?: "origin" | "webp" | "avif";
};

export function cdnImage(
  url: string | null | undefined,
  opts: CdnImageOptions = {}
): string {
  if (!url) return "";
  if (typeof url !== "string") return url as unknown as string;
  // Skip non-Storage URLs / blobs / data URIs / svg placeholders
  if (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.endsWith(".svg")
  ) {
    return url;
  }

  const PUBLIC = "/storage/v1/object/public/";
  const RENDER = "/storage/v1/render/image/public/";

  let transformed = url;
  if (url.includes(PUBLIC)) {
    transformed = url.replace(PUBLIC, RENDER);
  } else if (!url.includes(RENDER)) {
    // Not a Supabase storage URL — return as-is
    return url;
  }

  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(Math.round(opts.width)));
  if (opts.height) params.set("height", String(Math.round(opts.height)));
  if (opts.quality) params.set("quality", String(opts.quality));
  if (opts.resize) params.set("resize", opts.resize);
  params.set("format", opts.format ?? "origin");

  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}${params.toString()}`;
}
