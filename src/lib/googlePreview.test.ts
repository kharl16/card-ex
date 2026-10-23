import { afterEach, describe, expect, it, vi } from "vitest";
import { googleReturnPath, openGooglePreview } from "./googlePreview";

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

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