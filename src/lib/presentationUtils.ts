/**
 * Converts various URLs into embeddable iframe URLs.
 * Supports:
 *  - Google Slides: /edit, /pub, /preview → /embed
 *  - Google Drive file view → preview embed
 *  - Canva design links → embed mode
 *  - YouTube (watch, short, youtu.be) → embed
 *  - Vimeo → player embed
 *  - Raw URLs are returned as-is
 */
export function toEmbedUrl(url: string): string | null {
  if (!url) return null;

  try {
    const u = new URL(url);

    // Google Slides
    if (u.hostname === "docs.google.com" && u.pathname.includes("/presentation/d/")) {
      const match = u.pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
      }
    }

    // Google Drive file
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

    // YouTube – standard watch URL
    if ((u.hostname === "www.youtube.com" || u.hostname === "youtube.com") && u.pathname === "/watch") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}?rel=0`;
    }

    // YouTube – short URL
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }

    // YouTube – shorts
    if ((u.hostname === "www.youtube.com" || u.hostname === "youtube.com") && u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.replace("/shorts/", "");
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }

    // YouTube – already an embed URL
    if ((u.hostname === "www.youtube.com" || u.hostname === "youtube.com") && u.pathname.startsWith("/embed/")) {
      return url;
    }

    // Vimeo
    if (u.hostname === "vimeo.com" || u.hostname === "www.vimeo.com") {
      const match = u.pathname.match(/\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }

    // Vimeo – already player URL
    if (u.hostname === "player.vimeo.com") {
      return url;
    }

    // Canva
    if (u.hostname.includes("canva.com") && u.pathname.includes("/design/")) {
      if (!u.pathname.endsWith("/view")) {
        return `${u.origin}${u.pathname}/view?embed`;
      }
      return `${url}${url.includes("?") ? "&" : "?"}embed`;
    }

    // Direct file links (.pptx, .ppt, .docx, .xlsx) → Microsoft Office Online Viewer
    const officeExtensions = [".pptx", ".ppt", ".docx", ".xlsx", ".xls"];
    const pathname = u.pathname.toLowerCase();
    if (officeExtensions.some((ext) => pathname.endsWith(ext))) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }

    // Google Drive file URLs for Office docs → convert to direct download then use Office viewer
    if (u.hostname === "drive.google.com" && u.pathname.includes("/file/d/")) {
      // Already handled above for preview; this catch is for when we detect it's an office file via query hint
      const match = u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const directUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`;
      }
    }

    // Fallback
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
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") return "YouTube";
    if (u.hostname.includes("vimeo.com")) return "Vimeo";
    const pathname = u.pathname.toLowerCase();
    if (pathname.endsWith(".pptx") || pathname.endsWith(".ppt")) return "PowerPoint";
    if (pathname.endsWith(".docx")) return "Word";
    if (pathname.endsWith(".xlsx") || pathname.endsWith(".xls")) return "Excel";
    return "Link";
  } catch {
    return "Link";
  }
}