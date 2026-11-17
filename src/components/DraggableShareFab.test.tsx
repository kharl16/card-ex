import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DraggableShareFab from "./DraggableShareFab";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function mountCard(left: number, right: number) {
  const card = document.createElement("div");
  card.setAttribute("data-card-page", "");
  card.getBoundingClientRect = () => ({ left, right, top: 0, bottom: 800, width: right - left, height: 800, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(card);
}

function drag(btn: HTMLElement, toX: number, toY: number) {
  btn.setPointerCapture = vi.fn();
  btn.hasPointerCapture = vi.fn(() => false);
  fireEvent.pointerDown(btn, { button: 0, clientX: 500, clientY: 500, pointerId: 1 });
  fireEvent.pointerMove(btn, { clientX: toX, clientY: toY, pointerId: 1 });
  fireEvent.pointerUp(btn, { clientX: toX, clientY: toY, pointerId: 1 });
}

describe("Share button drag area", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("can be dragged outside the card to the far left of a laptop screen", () => {
    setViewport(1280, 800);
    mountCard(304, 976);
    render(<DraggableShareFab onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /share card/i });
    drag(btn, -5000, 400);
    expect(btn.style.left).toBe("12px");
  });

  it("can be dragged outside the card to the far right of a laptop screen", () => {
    setViewport(1280, 800);
    mountCard(304, 976);
    render(<DraggableShareFab onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /share card/i });
    drag(btn, 99999, 400);
    expect(btn.style.left).toBe(`${1280 - 48 - 12}px`);
  });

  it("first appears at middle-right, vertically centred beside the card's right edge", () => {
    setViewport(1280, 800);
    mountCard(304, 976);
    render(<DraggableShareFab onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /share card/i });
    expect(btn.style.left).toBe(`${976 - 48 - 12}px`);
    expect(btn.style.top).toBe(`${Math.round((800 - 48) / 2)}px`);
  });

  it("keeps the same phone limits: 12px from either screen edge", () => {
    setViewport(390, 844);
    mountCard(0, 390);
    render(<DraggableShareFab onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /share card/i });
    drag(btn, 99999, 99999);
    expect(btn.style.left).toBe("330px");
    expect(btn.style.top).toBe("784px");
  });
});
