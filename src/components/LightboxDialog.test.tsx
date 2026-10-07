import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import LightboxDialog, { type LightboxDialogProps } from "./LightboxDialog";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/carousel/ShareModal", () => ({ default: () => null }));
vi.mock("@/lib/images/lightboxPreloadCache", () => ({ preloadImage: vi.fn() }));

const images = Array.from({ length: 12 }, (_, i) => ({
  url: `https://example.com/photo-${i}.jpg`,
  alt: `Photo ${i}`,
}));

function props(index = 0): LightboxDialogProps {
  return {
    open: true,
    onOpenChange: vi.fn(),
    images,
    currentImage: images[index],
    index,
    count: images.length,
    zoomLevel: 1,
    setZoomLevel: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetZoom: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onDownload: vi.fn(),
    onClose: vi.fn(),
  };
}

describe("native lightbox photo continuity", () => {
  it("has an eager photo on every page before the settled index advances", () => {
    const { container } = render(<LightboxDialog {...props()} />);
    const scroller = container.querySelector("[data-lightbox-scroller]");
    expect(scroller?.children).toHaveLength(images.length);
    images.forEach((image, i) => {
      const photo = scroller?.children[i].querySelector("img");
      expect(photo).toHaveAttribute("src", image.url);
      expect(photo).toHaveAttribute("loading", "eager");
      expect(photo).toHaveAttribute("decoding", "async");
    });
  });

  it("retains the same photo elements after multi-page swipes and returning", () => {
    const { container, rerender } = render(<LightboxDialog {...props()} />);
    const originals = Array.from(container.querySelectorAll("[data-lightbox-scroller] img"));
    for (const index of [3, 7, 11, 6, 0]) {
      rerender(<LightboxDialog {...props(index)} />);
      const photos = container.querySelectorAll("[data-lightbox-scroller] img");
      expect(photos).toHaveLength(images.length);
      originals.forEach((photo, i) => expect(photos[i]).toBe(photo));
    }
  });
});