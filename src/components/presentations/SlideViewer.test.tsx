import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlideViewer } from "./SlideViewer";

vi.mock("pdfjs-dist", () => {
  const makePage = () => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 720 * scale, height: 540 * scale }),
    render: () => ({ promise: Promise.resolve() }),
  });
  const fakeDoc = { numPages: 3, getPage: () => Promise.resolve(makePage()) };
  return {
    GlobalWorkerOptions: {},
    getDocument: () => ({ onProgress: null, promise: Promise.resolve(fakeDoc), destroy: () => {} }),
  };
});
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "worker" }));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error polyfill for jsdom
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

async function openFullScreen() {
  await act(async () => {
    render(<SlideViewer url="deck.pdf" title="Deck" />);
  });
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Full Screen" }));
  await act(async () => {});
}

const counter = () => screen.getByText("Slide 1 of 3");

describe("full-screen controls visibility", () => {
  it("keeps the slide counter visible on mouse-driven screens (laptops)", async () => {
    await openFullScreen();
    expect(counter().className).toContain("opacity-100");
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(counter().className).not.toContain("opacity-0");
  });

  it("auto-hides the slide counter on touch devices and restores it on tap", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(pointer: coarse)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    await openFullScreen();
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(counter().className).toContain("opacity-0");
    fireEvent.pointerDown(screen.getByText("Slide 1 of 3").parentElement!);
    expect(counter().className).toContain("opacity-100");
  });
});
