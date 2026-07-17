// Helpers to build reliable Google Maps URLs for viewing a place and for
// getting driving directions. Handles Google Maps place URLs, short links,
// coordinate-embedded URLs, and plain addresses so every entry point
// consistently opens Google Maps (never a broken/place-only page).

export function extractCoordsFromMapsUrl(
  url: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!url) return null;
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]destination=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (
        !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ) {
        return { lat, lng };
      }
    }
  }
  return null;
}

export interface MapsTarget {
  mapsLink?: string | null;
  address?: string | null;
  location?: string | null;
}

/**
 * URL to view the destination on Google Maps.
 * Prefers the stored maps_link (place page), otherwise builds a search URL
 * from coords or address so it always resolves in Google Maps.
 */
export function getViewOnMapsUrl(t: MapsTarget): string | null {
  if (t.mapsLink && /^https?:\/\//i.test(t.mapsLink)) return t.mapsLink;
  const coords = extractCoordsFromMapsUrl(t.mapsLink);
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }
  const q = t.address || t.location;
  if (q) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  return null;
}

/**
 * URL that opens Google Maps directly in DIRECTIONS mode.
 * Uses the universal Maps URL API so it works on desktop, iOS, and Android.
 * Prefers coordinates (most reliable), falls back to address, then location.
 */
export function getDirectionsUrl(t: MapsTarget): string | null {
  const coords = extractCoordsFromMapsUrl(t.mapsLink);
  let destination: string | null = null;
  if (coords) {
    destination = `${coords.lat},${coords.lng}`;
  } else if (t.address) {
    destination = encodeURIComponent(t.address);
  } else if (t.location) {
    destination = encodeURIComponent(t.location);
  } else if (t.mapsLink) {
    // Last resort: just open the stored link with a navigate hint.
    return t.mapsLink.includes("?")
      ? `${t.mapsLink}&dir_action=navigate`
      : `${t.mapsLink}?dir_action=navigate`;
  }
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

export function openInNewTab(url: string | null | undefined) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
