/**
 * imageCarousels.ts
 *
 * Helpers for the new `cards.image_carousels` JSONB column which lets
 * Cover Photo, Profile Photo (avatar) and Company Logo each rotate through
 * a small set of images with a Ken Burns crossfade.
 *
 * Shape stored in DB:
 *   {
 *     cover:  { items: [{url, alt?}], autoPlayMs?: number },
 *     avatar: { items: [{url, alt?}], autoPlayMs?: number },
 *     logo:   { items: [{url, alt?}], autoPlayMs?: number },
 *   }
 *
 * The legacy single-image columns (`cover_url`, `avatar_url`, `logo_url`)
 * remain the canonical "primary" image and are used as fallback when no
 * carousel set is configured.
 */

export type ImageCarouselSlot = "cover" | "avatar" | "logo";

export interface ImageCarouselItem {
  url: string;
  alt?: string;
}

export interface ImageCarouselSet {
  items: ImageCarouselItem[];
  autoPlayMs?: number;
}

export type ImageCarouselsData = Partial<Record<ImageCarouselSlot, ImageCarouselSet>>;

const MAX_ITEMS = 10;
const DEFAULT_AUTOPLAY = 5000;

function parseSet(raw: unknown): ImageCarouselSet | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as any;
  if (!Array.isArray(r.items)) return undefined;
  const items = (r.items as any[])
    .filter((it) => it && typeof it.url === "string" && it.url)
    .map((it) => ({
      url: it.url as string,
      alt: typeof it.alt === "string" ? it.alt : undefined,
    }))
    .slice(0, MAX_ITEMS);
  if (items.length === 0) return undefined;
  return {
    items,
    autoPlayMs:
      typeof r.autoPlayMs === "number" && r.autoPlayMs >= 0
        ? r.autoPlayMs
        : DEFAULT_AUTOPLAY,
  };
}

export function parseImageCarousels(raw: unknown): ImageCarouselsData {
  const out: ImageCarouselsData = {};
  if (!raw || typeof raw !== "object") return out;
  const r = raw as any;
  for (const slot of ["cover", "avatar", "logo"] as ImageCarouselSlot[]) {
    const parsed = parseSet(r[slot]);
    if (parsed) out[slot] = parsed;
  }
  return out;
}

/**
 * Resolve the effective image list for a slot — uses carousel set when present,
 * otherwise wraps the single legacy URL in a 1-item array.
 */
export function resolveSlot(
  carousels: ImageCarouselsData,
  slot: ImageCarouselSlot,
  fallbackUrl?: string | null
): { items: ImageCarouselItem[]; autoPlayMs: number } {
  const set = carousels[slot];
  const extras = set?.items ?? [];
  const combined: ImageCarouselItem[] = [];
  if (fallbackUrl) combined.push({ url: fallbackUrl });
  for (const it of extras) {
    if (!combined.some((c) => c.url === it.url)) combined.push(it);
  }
  return {
    items: combined,
    autoPlayMs: set?.autoPlayMs ?? DEFAULT_AUTOPLAY,
  };
}

export const IMAGE_CAROUSEL_MAX_ITEMS = MAX_ITEMS;
export const IMAGE_CAROUSEL_DEFAULT_AUTOPLAY = DEFAULT_AUTOPLAY;
