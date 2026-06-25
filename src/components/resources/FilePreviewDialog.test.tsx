import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { FilePreviewDialog } from "./FilePreviewDialog";
import type { FileResource } from "@/types/resources";

const makeFile = (id: number, name: string): FileResource =>
  ({
    id,
    file_name: name,
    images: `https://example.com/${id}.jpg`,
    drive_link_download: null,
    drive_link_share: null,
    description: null,
    price_dp: null,
    price_srp: null,
    unilevel_points: null,
    folder_name: null,
    wholesale_package_commission: null,
    package_points_smc: null,
    rqv: null,
    infinity: null,
    check_match: null,
    give_me_5: null,
    just_4_you: null,
    view_video_url: null,
    visibility_level: "public_members",
    allowed_sites: null,
    is_active: true,
    created_at: "",
    updated_at: "",
  }) as FileResource;

const files: FileResource[] = [
  makeFile(1, "one"),
  makeFile(2, "two"),
  makeFile(3, "three"),
];

function getTrack(container: HTMLElement): HTMLElement {
  // The swipe surface is the first element with class touch-pan-y
  const el = container.ownerDocument.querySelector(
    ".touch-pan-y",
  ) as HTMLElement | null;
  if (!el) throw new Error("swipe track not found");
  return el;
}

function swipeLeft(track: HTMLElement, width = 600) {
  // Stub clientWidth so SWIPE_RATIO threshold is deterministic
  Object.defineProperty(track, "clientWidth", {
    configurable: true,
    value: width,
  });
  fireEvent.mouseDown(track, { button: 0, clientX: 500, clientY: 100 });
  fireEvent.mouseMove(window, { clientX: 480, clientY: 100 });
  fireEvent.mouseMove(window, { clientX: 200, clientY: 100 });
  fireEvent.mouseUp(window, { clientX: 200, clientY: 100 });
}

describe("FilePreviewDialog swipe gestures (regression)", () => {
  it("responds to repeated swipe gestures, not just the first", () => {
    vi.useFakeTimers();
    try {
      const onNavigate = vi.fn();
      const noop = () => {};

      const { rerender } = render(
        <FilePreviewDialog
          file={files[0]}
          files={files}
          open
          onOpenChange={noop}
          isFavorite={false}
          onToggleFavorite={noop}
          onLogEvent={noop}
          onNavigate={onNavigate}
        />,
      );

      // --- First swipe: should navigate to files[1]
      let track = getTrack(document.body);
      swipeLeft(track);
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenLastCalledWith(files[1]);

      // Parent commits the navigation
      rerender(
        <FilePreviewDialog
          file={files[1]}
          files={files}
          open
          onOpenChange={noop}
          isFavorite={false}
          onToggleFavorite={noop}
          onLogEvent={noop}
          onNavigate={onNavigate}
        />,
      );

      // --- Second swipe: should ALSO navigate (regression check)
      track = getTrack(document.body);
      swipeLeft(track);
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(onNavigate).toHaveBeenCalledTimes(2);
      expect(onNavigate).toHaveBeenLastCalledWith(files[2]);

      // Commit and try a third time (going back) to be thorough
      rerender(
        <FilePreviewDialog
          file={files[2]}
          files={files}
          open
          onOpenChange={noop}
          isFavorite={false}
          onToggleFavorite={noop}
          onLogEvent={noop}
          onNavigate={onNavigate}
        />,
      );

      track = getTrack(document.body);
      // swipe right -> prev
      Object.defineProperty(track, "clientWidth", { configurable: true, value: 600 });
      fireEvent.mouseDown(track, { button: 0, clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 130, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 450, clientY: 100 });
      fireEvent.mouseUp(window, { clientX: 450, clientY: 100 });
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(onNavigate).toHaveBeenCalledTimes(3);
      expect(onNavigate).toHaveBeenLastCalledWith(files[1]);
    } finally {
      vi.useRealTimers();
    }
  });
});
