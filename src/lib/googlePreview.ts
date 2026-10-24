import { safeRedirectPath } from "./authUrl";

export const GOOGLE_PREVIEW_GUIDANCE = "In the new tab, click Continue with Google. If no tab opens or Google still shows 403, use Lovable’s Open preview in new tab control, then try again. You’ll return to Tools Vault after signing in.";

export const GOOGLE_BLOCKED_GUIDANCE = "Your browser blocked the sign-in tab. Tap Open sign-in tab below, then click Continue with Google there. If it still won’t open, allow pop-ups for this site or use Lovable’s Open preview in new tab control. You’ll return to Tools Vault after signing in.";

export function googleReturnPath(params: URLSearchParams): string {
  return safeRedirectPath(params.get("redirect") || sessionStorage.getItem("auth_next"));
}

/** Standalone URL for the current auth page, carrying a sanitized return path. */
export function googlePreviewUrl(returnPath: string): string {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("redirect", safeRedirectPath(returnPath));
  return url.toString();
}

/** Start OAuth only in the standalone app, keeping its callback and storage on the same origin. */
export function openGooglePreview(returnPath: string): "standalone" | "opened" | "blocked" {
  if (window.self === window.top) return "standalone";
  // Open synchronously from the click, before any async OAuth work.
  const tab = window.open(googlePreviewUrl(returnPath), "_blank");
  if (!tab) return "blocked";
  tab.opener = null;
  return "opened";
}
