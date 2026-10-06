import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIGHTBOX_TRANSITION_MS,
  springForMs,
} from "@/hooks/useLightboxTransitionPref";

describe("lightbox transition motion", () => {
  it("uses the smooth standard duration", () => {
    expect(DEFAULT_LIGHTBOX_TRANSITION_MS).toBe(320);
    expect(springForMs(DEFAULT_LIGHTBOX_TRANSITION_MS)).toEqual({
      type: "spring",
      stiffness: 190,
      damping: 30,
      mass: 1.05,
    });
  });

  it("keeps instant motion available for reduced-motion handling", () => {
    expect(springForMs(0)).toMatchObject({
      type: "spring",
      stiffness: 800,
      damping: 60,
    });
  });
});