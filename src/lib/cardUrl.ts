/**
 * Get the public URL for a card, ensuring we never use editor/internal URLs
 */
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://tagex.app";

export function getPublicCardUrl(slug: string): string {
  if (!slug) return PUBLIC_SITE;
  return `${PUBLIC_SITE}/c/${slug}`;
}

export function getPublicSiteUrl(): string {
  return PUBLIC_SITE;
}
