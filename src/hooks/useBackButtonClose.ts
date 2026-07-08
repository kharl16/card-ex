import { useEffect } from "react";

/**
 * When `isOpen` is true, push a history entry so the device's hardware/browser
 * back button closes the overlay (drawer, radial menu, modal) instead of
 * navigating away from the page. Mirrors native mobile app behavior.
 *
 * If the overlay is closed by app UI (not the back button), the pushed
 * history entry is silently consumed on cleanup.
 */
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    let poppedByBack = false;
    // Tag the pushed entry so we can identify it if needed.
    window.history.pushState({ __lovableOverlay: true }, "");

    const handler = () => {
      poppedByBack = true;
      onClose();
    };
    window.addEventListener("popstate", handler);

    return () => {
      window.removeEventListener("popstate", handler);
      if (!poppedByBack) {
        // Overlay closed via UI — silently pop the extra history entry
        // so the back stack stays clean.
        try {
          window.history.back();
        } catch {
          // no-op
        }
      }
    };
  }, [isOpen]);
}
