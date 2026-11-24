import { useEffect, useState, useRef } from "react";
import { Eye, Users, CreditCard, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { buildDashboardTelemetry } from "@/lib/dashboardTelemetry";
import { cn } from "@/lib/utils";

type CardData = Tables<"cards">;

interface AnimatedStatsCardsProps {
  cards: CardData[];
  /** Compact, integrated gauges for the executive cockpit. */
  variant?: "default" | "cockpit";
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); ref.current = 0; return; }
    const start = ref.current;
    const diff = target - start;
    const startTime = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setValue(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else ref.current = target;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const stats = [
  { key: "views", label: "Total Views", icon: Eye, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary", borderColor: "border-primary/20" },
  { key: "published", label: "Published", icon: CreditCard, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400", borderColor: "border-emerald-500/20" },
  { key: "leads", label: "Leads", icon: Users, gradient: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400", borderColor: "border-blue-500/20" },
  { key: "growth", label: "This Week", icon: TrendingUp, gradient: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-400", borderColor: "border-violet-500/20" },
] as const;

function WeeklySparkline({ values }: { values: number[] }) {
  const width = 112;
  const height = 28;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 3 - (value / max) * (height - 8);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-24 overflow-visible"
      role="img"
      aria-label={`Seven-day views: ${values.join(", ")}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary) / 0.85)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function AnimatedStatsCards({ cards, variant = "default" }: AnimatedStatsCardsProps) {
  const [totalViews, setTotalViews] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [weekViews, setWeekViews] = useState(0);
  const [weeklySeries, setWeeklySeries] = useState<number[]>(Array(7).fill(0));

  const publishedCount = cards.filter((c) => c.is_published).length;

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const cardIds = cards.map((c) => c.id);
      const [analyticsRes, leadsRes] = await Promise.all([
        cardIds.length > 0
          ? supabase.from("analytics_daily").select("day, views").in("card_id", cardIds)
          : Promise.resolve({ data: [] }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id),
      ]);

      if (cancelled) return;
      const telemetry = buildDashboardTelemetry(analyticsRes.data || []);
      setTotalViews(telemetry.totalViews);
      setLeadsCount(leadsRes.count || 0);
      setWeekViews(telemetry.weeklyViews);
      setWeeklySeries(telemetry.weeklySeries);
    };

    loadStats().catch(() => {});
    return () => { cancelled = true; };
  }, [cards]);

  const values: Record<string, number> = {
    views: totalViews,
    published: publishedCount,
    leads: leadsCount,
    growth: weekViews,
  };

  const animatedViews = useCountUp(totalViews);
  const animatedPublished = useCountUp(publishedCount);
  const animatedLeads = useCountUp(leadsCount);
  const animatedGrowth = useCountUp(weekViews);

  const animatedValues: Record<string, number> = {
    views: animatedViews,
    published: animatedPublished,
    leads: animatedLeads,
    growth: animatedGrowth,
  };

  if (cards.length === 0) return null;

  if (variant === "cockpit") {
    return (
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-primary/25 bg-primary/20 sm:grid-cols-4" data-dashboard-telemetry>
        {stats.map((stat) => {
          const Icon = stat.icon;
          const showSparkline = stat.key === "views" || stat.key === "growth";
          return (
            <div key={stat.key} className="relative min-w-0 bg-background/85 p-3.5 backdrop-blur-xl sm:p-4" data-stat-key={stat.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {showSparkline && <WeeklySparkline values={weeklySeries} />}
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
                {animatedValues[stat.key].toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
              stat.borderColor,
              stat.gradient,
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <div className="relative">
              <Icon className={cn("mb-2 h-5 w-5", stat.iconColor)} />
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {animatedValues[stat.key].toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
