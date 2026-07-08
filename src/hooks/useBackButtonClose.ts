import { useEffect } from "react";

/**
 * When `isOpen` is true, push a history entry so the device's hardware/browser
 * back button closes the overlay (drawer, radial menu, modal) instead of
 * navigating away from the page. Mirrors native mobile app behavior.
 *
 * If the overlay is closed by app UI (not the back button), the pushed
 * history entry is silently consumed on cleanup — and any resulting popstate
 * is suppressed so sibling overlays don't misinterpret it as a back press.
 */

// Module-level counter of pending programmatic history.back() calls that
// should NOT trigger overlay-close handlers. Shared across all overlays.
let suppressPopCount = 0;

export function shouldSuppressOverlayPop(): boolean {
  if (suppressPopCount > 0) {
    suppressPopCount--;
    return true;
  }
  return false;
}

export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    let poppedByBack = false;
    window.history.pushState({ __lovableOverlay: true }, "");

    const handler = () => {
      if (shouldSuppressOverlayPop()) return;
      poppedByBack = true;
      onClose();
    };
    window.addEventListener("popstate", handler);

    return () => {
      window.removeEventListener("popstate", handler);
      if (!poppedByBack) {
        try {
          suppressPopCount++;
          window.history.back();
        } catch {
          suppressPopCount = Math.max(0, suppressPopCount - 1);
        }
      }
    };
  }, [isOpen]);
}
