import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CloseButton3D } from "@/components/ui/close-button-3d";

describe("standard close button", () => {
  it("every close button uses the same 44px size", () => {
    render(<CloseButton3D label="Exit full screen" className="absolute top-4 right-4" />);
    const btn = screen.getByRole("button", { name: "Exit full screen" });
    expect(btn.className).toContain("h-11");
    expect(btn.className).toContain("w-11");
  });

  it("windows show exactly one close button, or none when they draw their own", () => {
    const { unmount } = render(
      <Dialog open>
        <DialogContent><DialogTitle>A</DialogTitle></DialogContent>
      </Dialog>,
    );
    expect(document.querySelectorAll("[data-close-button]").length).toBe(1);
    unmount();
    render(
      <Dialog open>
        <DialogContent hideClose><DialogTitle>B</DialogTitle></DialogContent>
      </Dialog>,
    );
    expect(document.querySelectorAll("[data-close-button]").length).toBe(0);
  });
});

describe("floating Share button over open windows", () => {
  it("pressing the Share button does not close an open window", () => {
    const changes: boolean[] = [];
    render(
      <>
        <button data-floating-control>Share</button>
        <Dialog open onOpenChange={(o) => changes.push(o)}>
          <DialogContent><DialogTitle>Company Brochure</DialogTitle></DialogContent>
        </Dialog>
      </>,
    );
    fireEvent.pointerDown(screen.getByText("Share"));
    expect(changes).toEqual([]);
  });

  it("pressing elsewhere outside still closes the window", () => {
    const changes: boolean[] = [];
    render(
      <>
        <button>Elsewhere</button>
        <Dialog open onOpenChange={(o) => changes.push(o)}>
          <DialogContent><DialogTitle>Company Brochure</DialogTitle></DialogContent>
        </Dialog>
      </>,
    );
    fireEvent.pointerDown(screen.getByText("Elsewhere"));
    expect(changes).toEqual([false]);
  });
});
