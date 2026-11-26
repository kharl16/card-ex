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

  it("gives phones one full-width choice per row and keeps the laptop two-column grid", () => {
    render(<AmbientThemeSection theme={{ primary: "#123456", background: "#010309", text: "#ffffff" }} onChange={vi.fn()} />);

    const options = document.querySelector("[data-ambient-theme-options]");
    expect(options?.className).toContain("grid-cols-1");
    expect(options?.className).toContain("sm:grid-cols-2");
    expect(options?.className).not.toContain("min-[420px]");
  });

  it("labels the chosen theme in words and enlarges its artwork and type on phones", () => {
    render(<AmbientThemeSection theme={{ primary: "#123456", background: "#010309", text: "#ffffff", ambientTheme: "cosmic" }} onChange={vi.fn()} />);

    const cosmic = screen.getByRole("button", { name: /Cosmic Royal/ });
    expect(cosmic).toHaveTextContent("In use");
    expect(screen.getAllByText("In use")).toHaveLength(1);
    expect(cosmic.className).toContain("min-h-[212px]");
    expect(cosmic.className).toContain("sm:min-h-[184px]");
    expect(cosmic.className).toContain("[--ambient-choice-art-height:136px]");
    expect(cosmic.className).toContain("sm:[--ambient-choice-art-height:96px]");

    const nameLabel = cosmic.querySelector("span.block > span");
    expect(nameLabel?.className).toContain("text-base");
    expect(nameLabel?.className).toContain("sm:text-sm");

    const inUsePill = screen.getByText("In use");
    expect(inUsePill.className).toContain("text-[13px]");
    expect(inUsePill.className).toContain("sm:text-[11px]");

    const checkBadge = cosmic.querySelector("[data-ambient-theme] > span.absolute");
    expect(checkBadge?.className).toContain("h-11");
    expect(checkBadge?.className).toContain("sm:h-7");
  });

  it("saves dashboard sync independently through a large switch target", () => {
    const onChange = vi.fn();
    render(<AmbientThemeSection theme={{ primary: "#123456", background: "#010309", text: "#ffffff", ambientTheme: "obsidian" }} onChange={onChange} />);

    const sync = screen.getByRole("switch", { name: /Show this theme on my Dashboard/ });
    expect(sync).toHaveAttribute("aria-checked", "false");
    expect(sync).toHaveTextContent("Off");
    expect(sync).not.toHaveTextContent("On");
    fireEvent.click(sync);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ambientTheme: "obsidian", dashboardThemeSync: true }));
  });

  it("states the dashboard sync outcome in words and enlarges its type on phones", () => {
    render(<AmbientThemeSection theme={{ primary: "#123456", background: "#010309", text: "#ffffff", ambientTheme: "obsidian", dashboardThemeSync: true }} onChange={vi.fn()} />);

    const sync = screen.getByRole("switch", { name: /Show this theme on my Dashboard/ });
    expect(sync).toHaveAttribute("aria-checked", "true");
    expect(sync).toHaveTextContent("On");

    const label = sync.querySelector("span.min-w-0 > span:first-child");
    expect(label?.className).toContain("text-base");
    expect(label?.className).toContain("sm:text-sm");
    expect(sync.className).toContain("min-h-[76px]");
    expect(sync.className).toContain("sm:min-h-12");
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
