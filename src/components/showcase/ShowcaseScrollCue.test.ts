import { describe, expect, it } from "vitest";
import { hasMoreBelow, SCROLL_CUE_STRIP_PX } from "@/components/showcase/ShowcaseScrollCue";

describe("showcase scroll cue visibility", () => {
  it("shows while the page still has room below", () => {
    expect(
      hasMoreBelow({ scrollHeight: 2569, innerHeight: 1800, scrollY: 0 })
    ).toBe(true);
    expect(
      hasMoreBelow({ scrollHeight: 2569, innerHeight: 1800, scrollY: 700 })
    ).toBe(true);
  });

  it("hides once the visitor reaches the end of the page", () => {
    expect(
      hasMoreBelow({ scrollHeight: 2569, innerHeight: 1800, scrollY: 769 })
    ).toBe(false);
    expect(
      hasMoreBelow({ scrollHeight: 2569, innerHeight: 1800, scrollY: 900 })
    ).toBe(false);
  });

  it("hides when the whole card already fits the screen", () => {
    expect(
      hasMoreBelow({ scrollHeight: 1800, innerHeight: 1800, scrollY: 0 })
    ).toBe(false);
  });

  it("keeps the strip height matching its cancelling margin", () => {
    expect(SCROLL_CUE_STRIP_PX).toBe(24);
  });
});
