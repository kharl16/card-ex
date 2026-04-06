import { useEffect, useState, useRef } from "react";
import { Eye, Users, CreditCard, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface AnimatedStatsCardsProps {
  cards: CardData[];
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = ref.current;
    const diff = target - start;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setValue(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = target;
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

const stats = [
  { key: "views", label: "Total Views", icon: Eye, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary", borderColor: "border-primary/20" },
  { key: "published", label: "Published", icon: CreditCard, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400", borderColor: "border-emerald-500/20" },
  { key: "leads", label: "Leads", icon: Users, gradient: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400", borderColor: "border-blue-500/20" },
  { key: "growth", label: "This Week", icon: TrendingUp, gradient: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-400", borderColor: "border-violet-500/20" },
] as const;

export function AnimatedStatsCards({ cards }: AnimatedStatsCardsProps) {
  const [totalViews, setTotalViews] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [weekViews, setWeekViews] = useState(0);

  const publishedCount = cards.filter((c) => c.is_published).length;

  useEffect(() => {
    loadStats();
  }, [cards]);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split("T")[0];

    const cardIds = cards.map((c) => c.id);

    const [analyticsRes, leadsRes, weekRes] = await Promise.all([
      cardIds.length > 0
        ? supabase.from("analytics_daily").select("views").in("card_id", cardIds)
        : Promise.resolve({ data: [] }),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id),
      cardIds.length > 0
        ? supabase.from("analytics_daily").select("views").in("card_id", cardIds).gte("day", weekStr)
        : Promise.resolve({ data: [] }),
    ]);

    const views = (analyticsRes.data || []).reduce((s, r) => s + (r.views || 0), 0);
    setTotalViews(views);
    setLeadsCount(leadsRes.count || 0);
    const wv = (weekRes.data || []).reduce((s, r) => s + (r.views || 0), 0);
    setWeekViews(wv);
  };

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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className={`group relative overflow-hidden rounded-xl border ${stat.borderColor} bg-gradient-to-br ${stat.gradient} p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

            <div className="relative">
              <Icon className={`mb-2 h-5 w-5 ${stat.iconColor}`} />
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
