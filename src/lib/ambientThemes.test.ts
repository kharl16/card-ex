import { describe, expect, it } from "vitest";
import {
  AMBIENT_THEMES,
  getAmbientParallaxOffsets,
  getCardAmbientTheme,
  resolveDashboardAmbientTheme,
  withAmbientTheme,
} from "./ambientThemes";
import { buildCardSnapshot } from "./cardSnapshot";

describe("3D ambience theme rules", () => {
  it("offers the six approved choices and keeps existing cards on Classic Minimal", () => {
    expect(AMBIENT_THEMES.map((theme) => theme.id)).toEqual([
      "classic", "obsidian", "hyperdrive", "cosmic", "emerald", "titanium",
    ]);
    expect(getCardAmbientTheme(undefined)).toBe("classic");
    expect(getCardAmbientTheme({ primary: "#D4AF37" })).toBe("classic");
    expect(getCardAmbientTheme({ ambientTheme: "unknown" })).toBe("classic");
  });

  it("changes ambience without discarding colors, QR settings or other design fields", () => {
    const original = { primary: "#123456", qr: { pattern: "dots" }, dashboardThemeSync: false };
    const next = withAmbientTheme(original, "cosmic");
    expect(next).toMatchObject({ primary: "#123456", qr: { pattern: "dots" }, ambientTheme: "cosmic", dashboardThemeSync: false });
    expect(withAmbientTheme(next, "emerald", true).dashboardThemeSync).toBe(true);
  });

  it("uses the most recently edited synced card for the dashboard", () => {
    expect(resolveDashboardAmbientTheme([
      { theme: { ambientTheme: "cosmic", dashboardThemeSync: true }, updated_at: "2026-11-20T00:00:00Z" },
      { theme: { ambientTheme: "titanium", dashboardThemeSync: false }, updated_at: "2026-11-25T00:00:00Z" },
      { theme: { ambientTheme: "emerald", dashboardThemeSync: true }, updated_at: "2026-11-24T00:00:00Z" },
    ])).toBe("emerald");
    expect(resolveDashboardAmbientTheme([{ theme: { ambientTheme: "cosmic" } }])).toBe("classic");
    expect(resolveDashboardAmbientTheme([])).toBe("classic");
  });

  it("bounds parallax movement on short and very long pages", () => {
    expect(getAmbientParallaxOffsets(1000)).toEqual({ far: -25, middle: -60, near: -100 });
    expect(getAmbientParallaxOffsets(99999)).toEqual({ far: -60, middle: -144, near: -240 });
    expect(getAmbientParallaxOffsets(-100)).toEqual({ far: -0, middle: -0, near: -0 });
  });

  it("copies the visual ambience into snapshots but never copies dashboard sync", () => {
    const snapshot = buildCardSnapshot({
      id: "source-card",
      theme: { primary: "#D4AF37", ambientTheme: "obsidian", dashboardThemeSync: true },
      product_images: [], package_images: [], testimony_images: [], brochure_images: [],
    });
    expect(snapshot.theme.ambientTheme).toBe("obsidian");
    expect(snapshot.theme.dashboardThemeSync).toBeUndefined();
  });
});
