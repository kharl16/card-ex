import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AmbientThemeSection from "./AmbientThemeSection";
import AmbientThemeBackground from "@/components/ambient/AmbientThemeBackground";

describe("AmbientThemeSection", () => {
  it("selects a visual theme immediately while preserving existing card colors", () => {
    const onChange = vi.fn();
    render(<AmbientThemeSection theme={{ primary: "#123456", background: "#010309", text: "#ffffff" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Cosmic Royal/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ primary: "#123456", ambientTheme: "cosmic" }));
    expect(screen.getByRole("button", { name: /Classic Minimal/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("saves dashboard sync independently through a large switch target", () => {
    const onChange = vi.fn();
    render(<AmbientThemeSection theme={{ primary: "#123456", background: "#010309", text: "#ffffff", ambientTheme: "obsidian" }} onChange={onChange} />);

    const sync = screen.getByRole("switch", { name: /Use this theme on my Dashboard/ });
    expect(sync).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sync);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ambientTheme: "obsidian", dashboardThemeSync: true }));
  });
});

describe("AmbientThemeBackground accessibility", () => {
  it("uses static artwork when the device requests reduced motion", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));

    const { container, unmount } = render(<AmbientThemeBackground theme="cosmic" />);
    expect(container.querySelector("[data-ambient-motion='reduced']")).toBeInTheDocument();
    expect(container.querySelector("[data-ambient-theme='cosmic']")).toHaveAttribute("aria-hidden", "true");
    unmount();
    window.matchMedia = originalMatchMedia;
  });
});
