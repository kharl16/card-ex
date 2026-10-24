import { safeRedirectPath } from "./authUrl";

/** Embedded-preview help: what the visitor has to do next, one step at a time. */
export type GoogleGuidance = { heading: string; steps: string[] };

/**
 * Shown once the standalone tab is open. Google refuses to load inside the preview
 * frame, so the visitor has to start OAuth again there — step 2 is that action and
 * the guidance panel keeps it emphasised.
 */
export const GOOGLE_PREVIEW_GUIDANCE: GoogleGuidance = {
  heading: "Now finish signing in in the new tab",
  steps: [
    "Card-Ex opened in its own tab. Google can’t sign you in inside this preview.",
    "Click Continue with Google again in that new tab.",
    "Choose your account there — you’ll return to Tools Vault signed in.",
    "No tab, or Google shows 403? Use Lovable’s Open preview in new tab control, then try again.",
  ],
};

/** Shown when the browser blocked the tab; the direct link below opens the same page. */
export const GOOGLE_BLOCKED_GUIDANCE: GoogleGuidance = {
  heading: "Your browser blocked the sign-in tab",
  steps: [
    "Tap Open sign-in tab below to open Card-Ex on its own.",
    "Then click Continue with Google in that tab.",
    "Still nothing? Allow pop-ups for this site, or use Lovable’s Open preview in new tab control.",
  ],
};

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
