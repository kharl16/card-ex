/**
 * Converts various Google Slides/Drive URLs into embeddable iframe URLs.
 * Supports:
 *  - Google Slides: /edit, /pub, /preview → /embed
 *  - Google Drive file view → preview embed
 *  - Canva design links → embed mode
 *  - Raw URLs are returned as-is
 */
export function toEmbedUrl(url: string): string | null {
  if (!url) return null;

  try {
    const u = new URL(url);

    // Google Slides
    // e.g. https://docs.google.com/presentation/d/XXXX/edit
    if (u.hostname === "docs.google.com" && u.pathname.includes("/presentation/d/")) {
      const match = u.pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
      }
    }

    // Google Drive file (PDF / Slides shared via Drive)
    // e.g. https://drive.google.com/file/d/XXXX/view
    if (u.hostname === "drive.google.com" && u.pathname.includes("/file/d/")) {
      const match = u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    // Google Drive open?id= format
    if (u.hostname === "drive.google.com" && u.pathname === "/open") {
      const id = u.searchParams.get("id");
      if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    }

    // Canva
    if (u.hostname.includes("canva.com") && u.pathname.includes("/design/")) {
      // Canva embed: append /view?embed
      if (!u.pathname.endsWith("/view")) {
        return `${u.origin}${u.pathname}/view?embed`;
      }
      return `${url}${url.includes("?") ? "&" : "?"}embed`;
    }

    // Fallback: return as-is (could be a direct PDF, etc.)
    return url;
  } catch {
    return url;
  }
}

/**
 * Detects the source type from a URL for display purposes.
 */
export function detectPresentationSource(url: string): string {
  if (!url) return "Link";
  try {
    const u = new URL(url);
    if (u.hostname === "docs.google.com") return "Google Slides";
    if (u.hostname === "drive.google.com") return "Google Drive";
    if (u.hostname.includes("canva.com")) return "Canva";
    return "Link";
  } catch {
    return "Link";
  }
}
