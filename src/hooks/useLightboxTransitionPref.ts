import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Persist the user's preferred Lightbox slide/fade transition speed
 * in localStorage so it stays consistent across sessions and devices
 * (same browser). Works signed-out — no DB round-trip required.
 *
 * The stored number is still a "duration" in ms so old values keep working,
 * but the lightbox now also derives a spring config from it for physics-based
 * swipe navigation (finger-tracked drag → spring settle).
 */

const STORAGE_KEY = "cardex.lightbox.transitionMs";
export const DEFAULT_LIGHTBOX_TRANSITION_MS = 180;
export const MIN_LIGHTBOX_TRANSITION_MS = 0;
export const MAX_LIGHTBOX_TRANSITION_MS = 600;

export interface SpringConfig {
  type: "spring";
  stiffness: number;
  damping: number;
  mass?: number;
}

export const LIGHTBOX_SPEED_PRESETS: Array<{
  label: string;
  value: number;
  spring: SpringConfig;
}> = [
  { label: "Instant",   value: 0,   spring: { type: "spring", stiffness: 800, damping: 60 } },
  { label: "Fast",      value: 120, spring: { type: "spring", stiffness: 500, damping: 45 } },
  { label: "Default",   value: 180, spring: { type: "spring", stiffness: 350, damping: 38 } },
  { label: "Smooth",    value: 280, spring: { type: "spring", stiffness: 220, damping: 32 } },
  { label: "Cinematic", value: 450, spring: { type: "spring", stiffness: 140, damping: 28 } },
];

/** Map an arbitrary ms value to the nearest preset's spring config. */
export function springForMs(ms: number): SpringConfig {
  let best = LIGHTBOX_SPEED_PRESETS[2];
  let bestDist = Infinity;
  for (const p of LIGHTBOX_SPEED_PRESETS) {
    const d = Math.abs(p.value - ms);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best.spring;
}

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

  const spring = useMemo(() => springForMs(transitionMs), [transitionMs]);

  return { transitionMs, setTransitionMs, reset, spring };
}
