import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GooglePreviewGuidance } from "@/components/auth/GooglePreviewGuidance";
import { googleReturnPath, openGooglePreview } from "./googlePreview";

afterEach(() => { vi.unstubAllGlobals(); cleanup(); sessionStorage.clear(); });

describe("embedded Google sign-in", () => {
  it("preserves the Tools Vault destination across the new tab", () => {
    sessionStorage.setItem("auth_next", "/tools?cardId=owner-card");
    const path = googleReturnPath(new URLSearchParams());
    expect(path).toBe("/tools?cardId=owner-card");
    const tab = { opener: {} };
    const open = vi.fn().mockReturnValue(tab);
    vi.stubGlobal("window", { self: {}, top: {}, open, location: { href: "https://id-preview--example.lovable.app/auth?mode=signin#private" } });
    expect(openGooglePreview(path)).toBe("opened");
    const url = new URL(open.mock.calls[0][0]);
    expect(url.origin).toBe("https://id-preview--example.lovable.app");
    expect(url.searchParams.get("redirect")).toBe("/tools?cardId=owner-card");
    expect(url.hash).toBe("");
    expect(tab.opener).toBeNull();
  });

  it("honors an explicit return path and rejects external destinations", () => {
    sessionStorage.setItem("auth_next", "/tools");
    expect(googleReturnPath(new URLSearchParams("redirect=%2Fworkspace"))).toBe("/workspace");
    expect(googleReturnPath(new URLSearchParams("redirect=https%3A%2F%2Fevil.example"))).toBe("/dashboard");
  });

  it("reports a blocked tab without navigating the frame to Google", () => {
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", { self: {}, top: {}, open, location: { href: "https://id-preview--example.lovable.app/signup?ref=CEX-ABC123" } });
    expect(openGooglePreview("/tools")).toBe("blocked");
    expect(new URL(open.mock.calls[0][0]).searchParams.get("ref")).toBe("CEX-ABC123");
  });

  it("keeps standalone phone, tablet and laptop OAuth unchanged", () => {
    const self = {};
    const open = vi.fn();
    vi.stubGlobal("window", { self, top: self, open });
    expect(openGooglePreview("/tools")).toBe("standalone");
    expect(open).not.toHaveBeenCalled();
  });
});

describe("blocked-tab recovery", () => {
  it("builds a direct fallback link that keeps the Tools Vault return", async () => {
    const { googlePreviewUrl, GOOGLE_BLOCKED_GUIDANCE } = await import("./googlePreview");
    vi.stubGlobal("window", { location: { href: "https://id-preview--example.lovable.app/auth?mode=signin#x" } });
    const url = new URL(googlePreviewUrl("/tools"));
    expect(url.searchParams.get("redirect")).toBe("/tools");
    expect(url.hash).toBe("");
    expect(GOOGLE_BLOCKED_GUIDANCE.steps.join(" ")).not.toContain("In the new tab");
  });
});

describe("embedded guidance copy", () => {
  it("says the visitor must click Continue with Google again in the new tab", async () => {
    const { GOOGLE_PREVIEW_GUIDANCE } = await import("./googlePreview");
    expect(GOOGLE_PREVIEW_GUIDANCE.heading).toMatch(/new tab/i);
    expect(GOOGLE_PREVIEW_GUIDANCE.steps[1]).toMatch(/click Continue with Google again/i);
    expect(GOOGLE_PREVIEW_GUIDANCE.steps[1]).toMatch(/new tab/i);
  });

  it("still points the blocked-tab visitor at Continue with Google in the opened tab", async () => {
    const { GOOGLE_BLOCKED_GUIDANCE } = await import("./googlePreview");
    const copy = GOOGLE_BLOCKED_GUIDANCE.steps.join(" ");
    expect(copy).toMatch(/Open sign-in tab/i);
    expect(copy).toMatch(/click Continue with Google/i);
  });
});

describe("guidance panel", () => {
  it("numbers the steps and emphasises the click-again instruction", async () => {
    const { GOOGLE_PREVIEW_GUIDANCE } = await import("./googlePreview");
    render(<GooglePreviewGuidance guidance={GOOGLE_PREVIEW_GUIDANCE} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(GOOGLE_PREVIEW_GUIDANCE.steps.length);
    expect(items[1].textContent).toBe(GOOGLE_PREVIEW_GUIDANCE.steps[1]);
    expect(screen.queryByRole("link", { name: /Open sign-in tab/i })).toBeNull();
  });

  it("shows the direct fallback link only when the tab was blocked", async () => {
    const { GOOGLE_BLOCKED_GUIDANCE } = await import("./googlePreview");
    render(<GooglePreviewGuidance guidance={GOOGLE_BLOCKED_GUIDANCE} fallbackUrl="https://id-preview--example.lovable.app/auth?redirect=%2Ftools" />);
    const link = screen.getByRole("link", { name: /Open sign-in tab/i });
    expect(link).toHaveAttribute("href", "https://id-preview--example.lovable.app/auth?redirect=%2Ftools");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders nothing while the visitor is signing in on the live site", async () => {
    const { container } = render(<GooglePreviewGuidance guidance={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
