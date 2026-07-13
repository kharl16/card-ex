/**
 * Module-level in-memory cache of preloaded <img> elements.
 * Reused across every LightboxDialog mount so neighbor images decoded
 * during a previous open remain warm in the browser's memory cache.
 *
 * We keep a bounded LRU (Map preserves insertion order) so long browsing
 * sessions don't leak unbounded HTMLImageElement references.
 */

const MAX_ENTRIES = 40;
const cache = new Map<string, HTMLImageElement>();

export type FetchPriority = "high" | "low" | "auto";

export function preloadImage(url: string, priority: FetchPriority = "auto"): HTMLImageElement | null {
  if (!url) return null;

  const existing = cache.get(url);
  if (existing) {
    // Refresh LRU position
    cache.delete(url);
    cache.set(url, existing);
    // Upgrade priority if a stronger hint arrives (e.g. neighbor became current)
    try {
      if (priority !== "auto") (existing as any).fetchPriority = priority;
    } catch {
      /* ignore */
    }
    return existing;
  }

  const img = new Image();
  img.decoding = "async";
  try {
    (img as any).fetchPriority = priority;
  } catch {
    /* older browsers — ignore */
  }
  img.src = url;

  cache.set(url, img);
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) cache.delete(oldestKey);
  }
  return img;
}

export function hasPreloaded(url: string): boolean {
  return cache.has(url);
}
