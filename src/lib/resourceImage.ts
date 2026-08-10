/**
 * Resource images (Files, Folders, Ambassadors, Directory) are frequently the
 * raw uploads — some are 6-8 MB PNGs served with a weak Cache-Control. Routing
 * them through the bounded Supabase render preset:
 *
 *  - shrinks payloads by ~95% (1200px contain, q82, WebP when supported)
 *  - returns a stable, CDN-cached URL so the browser can reuse it on every
 *    later visit instead of re-downloading the original
 *  - uses the SAME url for the grid tile and the full preview, so opening a
 *    photo is instant (already in the HTTP cache)
 *
 * Non-Supabase URLs (Google Drive / Glide assets) are returned unchanged.
 */
import { getRenderUrl } from "@/lib/images";

export function resourceImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  return getRenderUrl(url, "product", "default");
}
