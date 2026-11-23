import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { buildDashboardTiles } from "./DashboardQuadrantTiles";
import type { DashboardTileStats } from "@/hooks/useDashboardTileStats";

const stats: DashboardTileStats = {
  loading: false,
  branches: 3,
  nearestBranch: null,
  videos: 5,
  newVideos: 0,
  resources: 10,
  latestResource: null,
  links: 4,
  leads: 0,
  appointments: 0,
  gallery: 0,
};

describe("dashboard command-center tiles", () => {
  it("adds Quick Links as the 5th tile after Locator, Videos, Resources and Workspace", () => {
    expect(buildDashboardTiles(stats).map((t) => t.label)).toEqual([
      "Locator",
      "Videos",
      "Resources",
      "Workspace",
      "Quick Links",
    ]);
  });

  it("opens the dedicated Quick Links page and shows the live link count", () => {
    const links = buildDashboardTiles(stats)[4];
    expect(links.path).toBe("/resources/links");
    expect(links.primary).toBe("4 Links");
  });

  it("spans the full row on laptops", () => {
    expect(buildDashboardTiles(stats)[4].wide).toBe(true);
  });

  it("renders Quick Links phone-compact while the other four stay full size", () => {
    const tiles = buildDashboardTiles(stats);
    expect(tiles[4].compact).toBe(true);
    expect(tiles.slice(0, 4).map((t) => Boolean(t.compact))).toEqual([false, false, false, false]);
  });
});
