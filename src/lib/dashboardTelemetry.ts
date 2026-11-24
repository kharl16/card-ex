export interface DashboardAnalyticsRow {
  day: string;
  views: number | null;
}

export interface DashboardTelemetry {
  totalViews: number;
  weeklyViews: number;
  /** Seven daily totals, oldest first, including zero-view days. */
  weeklySeries: number[];
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Aggregate the same analytics_daily rows used by the existing dashboard.
 * The week is a rolling seven-day UTC window, matching analytics_daily.day.
 */
export function buildDashboardTelemetry(
  rows: DashboardAnalyticsRow[],
  now = new Date(),
): DashboardTelemetry {
  const today = new Date(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (6 - index));
    return isoDay(day);
  });
  const dailyTotals = new Map<string, number>(days.map((day) => [day, 0]));

  let totalViews = 0;
  for (const row of rows) {
    const views = Math.max(0, row.views ?? 0);
    totalViews += views;
    if (dailyTotals.has(row.day)) {
      dailyTotals.set(row.day, (dailyTotals.get(row.day) ?? 0) + views);
    }
  }

  const weeklySeries = days.map((day) => dailyTotals.get(day) ?? 0);
  return {
    totalViews,
    weeklyViews: weeklySeries.reduce((sum, views) => sum + views, 0),
    weeklySeries,
  };
}
