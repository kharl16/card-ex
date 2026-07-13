import { useCallback, useEffect, useState } from "react";

/**
 * Persist the user's preferred Lightbox slide/fade transition speed
 * in localStorage so it stays consistent across sessions and devices
 * (same browser). Works signed-out — no DB round-trip required.
 */

const STORAGE_KEY = "cardex.lightbox.transitionMs";
export const DEFAULT_LIGHTBOX_TRANSITION_MS = 180;
export const MIN_LIGHTBOX_TRANSITION_MS = 0;
export const MAX_LIGHTBOX_TRANSITION_MS = 600;

export const LIGHTBOX_SPEED_PRESETS: Array<{ label: string; value: number }> = [
  { label: "Instant", value: 0 },
  { label: "Fast", value: 120 },
  { label: "Default", value: 180 },
  { label: "Smooth", value: 280 },
  { label: "Cinematic", value: 450 },
];

function readStored(): number {
  if (typeof window === "undefined") return DEFAULT_LIGHTBOX_TRANSITION_MS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_LIGHTBOX_TRANSITION_MS;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_LIGHTBOX_TRANSITION_MS;
    return Math.min(MAX_LIGHTBOX_TRANSITION_MS, Math.max(MIN_LIGHTBOX_TRANSITION_MS, Math.round(n)));
  } catch {
    return DEFAULT_LIGHTBOX_TRANSITION_MS;
  }
}

export function useLightboxTransitionPref() {
  const [transitionMs, setTransitionMsState] = useState<number>(() => readStored());

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTransitionMsState(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTransitionMs = useCallback((value: number) => {
    const clamped = Math.min(
      MAX_LIGHTBOX_TRANSITION_MS,
      Math.max(MIN_LIGHTBOX_TRANSITION_MS, Math.round(value))
    );
    setTransitionMsState(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* ignore quota / privacy mode */
    }
  }, []);

  const reset = useCallback(() => setTransitionMs(DEFAULT_LIGHTBOX_TRANSITION_MS), [setTransitionMs]);

  return { transitionMs, setTransitionMs, reset };
}
