import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import { FilePreviewDialog } from "./FilePreviewDialog";
import type { FileResource } from "@/types/resources";

vi.mock("@/contexts/ResourcesContext", () => ({ useResources: () => ({ isResourceSuperAdmin: false }) }));
vi.mock("@/lib/images/lightboxPreloadCache", () => ({ preloadImage: vi.fn() }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
const files = Array.from({ length: 12 }, (_, id) => ({
  id, file_name: `Photo ${id}`, images: `https://example.com/${id}.jpg`,
  images_2: id === 0 ? "https://example.com/alternate.jpg" : null,
}) as FileResource);
function dialog(index: number, navigate = vi.fn()) {
  return <FilePreviewDialog file={files[index]} files={files} open onOpenChange={vi.fn()}
    isFavorite={false} onToggleFavorite={vi.fn()} onLogEvent={vi.fn()} onNavigate={navigate} />;
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function track(container: HTMLElement) {
  const el = container.querySelector<HTMLDivElement>("[data-resource-gallery-scroller]");
  if (!el) throw new Error("Missing native gallery");
  Object.defineProperty(el, "clientWidth", { configurable: true, value: 600 });
  el.scrollTo = vi.fn((options?: ScrollToOptions | number, y?: number) => { el.scrollLeft = typeof options === "number" ? options : options?.left ?? 0; });
  return el;
}
describe("Resources native photo gallery", () => {
  it("keeps every main and alternate photo eagerly mounted across rapid multi-page navigation", () => {
    const { container, rerender } = render(dialog(0));
    const scroller = track(container);
    expect(scroller.children).toHaveLength(12);
    expect(scroller).toHaveClass("snap-x", "snap-mandatory");
    const originals = Array.from(scroller.querySelectorAll("img"));
    expect(originals).toHaveLength(13);
    originals.forEach(photo => expect(photo).toHaveAttribute("loading", "eager"));
    for (const i of [4, 8, 11, 0]) {
      rerender(dialog(i));
      originals.forEach((photo, n) => expect(scroller.querySelectorAll("img")[n]).toBe(photo));
    }
  });
  it("syncs directly to the rested page, without timers that advance one photo at a time", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const { container, rerender } = render(dialog(0, navigate));
    const scroller = track(container);
    scroller.scrollLeft = 600 * 7;
    fireEvent.scroll(scroller);
    expect(navigate).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(121); });
    expect(navigate).toHaveBeenLastCalledWith(files[7]);
    rerender(dialog(7, navigate));
    scroller.scrollLeft = 600 * 10;
    fireEvent(scroller, new Event("scrollend"));
    expect(navigate).toHaveBeenLastCalledWith(files[10]);
  });
  it("uses native smooth scrolling for arrows and keeps 1:1 in full screen", () => {
    const { container, getByRole } = render(dialog(0));
    const scroller = track(container);
    fireEvent.click(getByRole("button", { name: "Next image" }));
    expect(scroller.scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: "smooth" });
    fireEvent.click(getByRole("button", { name: "Full screen" }));
    expect(getByRole("button", { name: "Reset zoom" })).toBeVisible();
  });
  it("retains alternate photo elements when switching photo slots", () => {
    const { container, getByRole } = render(dialog(0));
    const alternate = container.querySelector('img[src="https://example.com/alternate.jpg"]');
    expect(alternate).toHaveClass("invisible");
    fireEvent.click(getByRole("button", { name: /^2$/ }));
    expect(container.querySelector('img[src="https://example.com/alternate.jpg"]')).toBe(alternate);
    expect(alternate).not.toHaveClass("invisible");
  });
  it("still supports pinch zoom and the 1:1 reset", async () => {
    const { container, getByRole } = render(dialog(0));
    const surface = container.querySelector('.touch-pan-x');
    if (!surface) throw new Error("Missing zoom surface");
    fireEvent.touchStart(surface, { touches: [{ clientX: 200, clientY: 100 }, { clientX: 260, clientY: 100 }] });
    await act(async () => { fireEvent.touchMove(surface, { touches: [{ clientX: 170, clientY: 100 }, { clientX: 290, clientY: 100 }] }); });
    const image = container.querySelector('img[alt="Photo 0"]');
    expect(image?.getAttribute("style")).toContain("scale(2)");
    fireEvent.click(getByRole("button", { name: "Reset zoom" }));
    expect(image?.getAttribute("style")).toContain("scale(1)");
  });
  it("re-pins the same photo after the viewer width changes", () => {
    let resize: (() => void) | undefined;
    vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    const { container } = render(dialog(4));
    const scroller = track(container);
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 900 });
    act(() => resize?.());
    expect(scroller.scrollTo).toHaveBeenLastCalledWith({ left: 3600, behavior: "auto" });
  });
});
