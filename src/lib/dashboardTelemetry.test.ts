import { describe, expect, it } from "vitest";
import { buildDashboardTelemetry } from "./dashboardTelemetry";

const now = new Date("2026-11-24T12:00:00.000Z");

describe("dashboard telemetry", () => {
  it("totals all views and returns a rolling seven-day series with zero days", () => {
    const result = buildDashboardTelemetry([
      { day: "2026-11-17", views: 50 },
      { day: "2026-11-18", views: 4 },
      { day: "2026-11-24", views: 6 },
    ], now);

    expect(result.totalViews).toBe(60);
    expect(result.weeklyViews).toBe(10);
    expect(result.weeklySeries).toEqual([4, 0, 0, 0, 0, 0, 6]);
  });

  it("combines multiple card rows on the same day", () => {
    const result = buildDashboardTelemetry([
      { day: "2026-11-23", views: 3 },
      { day: "2026-11-23", views: 7 },
      { day: "2026-11-24", views: null },
    ], now);

    expect(result.totalViews).toBe(10);
    expect(result.weeklyViews).toBe(10);
    expect(result.weeklySeries[5]).toBe(10);
    expect(result.weeklySeries[6]).toBe(0);
  });
});
