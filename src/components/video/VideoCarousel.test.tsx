import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

// --- Mocks ---------------------------------------------------------------
// Mock embla so we have a deterministic active slide (index 0) and no real
// carousel behaviour to fight with in jsdom.
vi.mock("embla-carousel-react", () => {
  const listeners: Record<string, Array<() => void>> = {};
  const api = {
    canScrollPrev: () => false,
    canScrollNext: () => true,
    scrollPrev: () => {},
    scrollNext: () => {},
    selectedScrollSnap: () => 0,
    on: (evt: string, cb: () => void) => {
      (listeners[evt] ||= []).push(cb);
    },
    off: () => {},
  };
  const useEmblaCarousel = () => [() => {}, api] as const;
  return { default: useEmblaCarousel };
});

vi.mock("embla-carousel-auto-scroll", () => ({
  default: () => ({ name: "autoScroll" }),
}));

// Render dialog as a probe so the test can assert open/closed state.
vi.mock("@/components/video/VideoFullscreenDialog", () => ({
  default: ({ open }: { open: boolean }) => (
    <div data-testid="fullscreen-state">{open ? "open" : "closed"}</div>
  ),
}));

// Force getEmbedUrl to return empty so every slide renders the tap-target div
// (not an iframe), giving the test a uniform surface to exercise.
vi.mock("@/lib/videoUtils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/videoUtils")>(
    "@/lib/videoUtils",
  );
  return {
    ...actual,
    getEmbedUrl: () => "",
    getThumbnailUrl: () => "",
    getShareUrl: (u: string) => u,
    getDownloadUrl: () => null,
  };
});

import VideoCarousel from "./VideoCarousel";
import type { VideoItem } from "@/lib/videoUtils";

const videos: VideoItem[] = [
  { url: "https://example.com/a.mp4", source: "unknown", title: "A" },
  { url: "https://example.com/b.mp4", source: "unknown", title: "B" },
  { url: "https://example.com/c.mp4", source: "unknown", title: "C" },
];

function firePointer(
  el: Element,
  type: "pointerdown" | "pointerup",
  x: number,
  y: number,
) {
  const evt = new window.PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType: "touch",
  });
  el.dispatchEvent(evt);
}

describe("VideoCarousel swipe vs tap regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT open fullscreen when a pointer drag (swipe) occurs on a thumbnail", () => {
    render(<VideoCarousel videos={videos} />);

    // The tap-target divs use role="button". Pick one (an inactive slide).
    const targets = screen.getAllByRole("button");
    // Filter to the thumbnail wrappers (they have the cursor-pointer class).
    const thumb = targets.find((el) =>
      el.className.includes("cursor-pointer"),
    );
    expect(thumb).toBeDefined();

    act(() => {
      firePointer(thumb!, "pointerdown", 100, 200);
      firePointer(thumb!, "pointerup", 180, 205); // 80px horizontal drag
    });

    expect(screen.getByTestId("fullscreen-state")).toHaveTextContent("closed");
  });

  it("DOES open fullscreen on a clean tap (pointerdown + pointerup at same spot)", () => {
    render(<VideoCarousel videos={videos} />);

    const thumb = screen
      .getAllByRole("button")
      .find((el) => el.className.includes("cursor-pointer"));
    expect(thumb).toBeDefined();

    act(() => {
      firePointer(thumb!, "pointerdown", 100, 200);
      firePointer(thumb!, "pointerup", 102, 201); // <8px movement = tap
    });

    expect(screen.getByTestId("fullscreen-state")).toHaveTextContent("open");
  });

  it("ignores small vertical jitter but blocks any drag >= 8px", () => {
    render(<VideoCarousel videos={videos} />);

    const thumb = screen
      .getAllByRole("button")
      .find((el) => el.className.includes("cursor-pointer"));

    act(() => {
      firePointer(thumb!, "pointerdown", 50, 50);
      firePointer(thumb!, "pointerup", 50, 70); // 20px vertical = scroll, not tap
    });

    expect(screen.getByTestId("fullscreen-state")).toHaveTextContent("closed");
  });
});
