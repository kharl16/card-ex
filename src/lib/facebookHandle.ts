/**
 * Facebook handle helpers.
 *
 * Card-Ex requires a Facebook profile URL at signup. The Messenger link is
 * always derived from it: https://www.facebook.com/<handle> → https://m.me/<handle>
 */

/** Extract the handle (or numeric profile id) from a Facebook profile URL. */
export function extractFacebookHandle(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url) return null;

  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  const readFromParts = (host: string, pathname: string, search: URLSearchParams | null) => {
    const cleanHost = host.replace(/^(www|web|m|mobile|business|l)\./i, "").toLowerCase();
    if (cleanHost === "m.me") {
      const [handle] = pathname.split("/").filter(Boolean);
      return handle || null;
    }
    if (cleanHost !== "facebook.com" && cleanHost !== "fb.com" && cleanHost !== "fb.me") return null;

    if (pathname.toLowerCase().includes("profile.php")) {
      const id = search?.get("id");
      if (id) return id;
    }

    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    // Handle /people/Name/1000123 and /pg/<handle> style URLs
    if (parts[0].toLowerCase() === "people" && parts.length >= 3) return parts[2];
    if ((parts[0].toLowerCase() === "pg" || parts[0].toLowerCase() === "pages") && parts.length >= 2) {
      return parts[parts.length - 1];
    }
    return parts[0];
  };

  let handle: string | null = null;
  try {
    const parsed = new URL(withProtocol);
    handle = readFromParts(parsed.hostname, parsed.pathname, parsed.searchParams);
  } catch {
    const match = url.match(/(?:facebook\.com|fb\.com|fb\.me|m\.me)\/([^/?#]+)/i);
    handle = match?.[1] ?? null;
  }

  if (!handle) return null;
  // Strip any leftover query/fragment and decode
  handle = decodeURIComponent(handle.split(/[?#]/)[0]).trim().replace(/^@/, "");
  if (!handle) return null;
  // Ignore non-profile Facebook paths
  const reserved = new Set(["sharer", "share", "login", "home.php", "groups", "events", "watch", "marketplace"]);
  if (reserved.has(handle.toLowerCase())) return null;
  return handle;
}

/** Build the Messenger URL for a Facebook profile URL. Returns null when no handle. */
export function messengerUrlFromFacebook(facebookUrl: string | null | undefined): string | null {
  const handle = extractFacebookHandle(facebookUrl);
  return handle ? `https://m.me/${handle}` : null;
}
