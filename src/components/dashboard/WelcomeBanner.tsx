import { useMemo, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface WelcomeBannerProps {
  profile: any;
  cards: CardData[];
}

export function WelcomeBanner({ profile, cards }: WelcomeBannerProps) {
  const [totalViews, setTotalViews] = useState(0);

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  useEffect(() => {
    if (cardIds.length === 0) {
      setTotalViews(0);
      return;
    }
    const fetchViews = async () => {
      const { data } = await supabase
        .from("analytics_daily")
        .select("views")
        .in("card_id", cardIds);
      if (data) {
        setTotalViews(data.reduce((sum, row) => sum + (row.views || 0), 0));
      }
    };
    fetchViews();
  }, [cardIds]);

  const stats = useMemo(() => {
    const published = cards.filter((c) => c.is_published).length;
    return { totalCards: cards.length, published };
  }, [cards]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Amazing morning";
    if (hour < 18) return "Amazing afternoon";
    return "Amazing evening";
  }, []);

  const name = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-accent/30 p-5 sm:p-6 md:p-8">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Dashboard</span>
          </div>
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">
            {greeting}, <span className="text-primary">{name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's an overview of your digital presence
          </p>
        </div>

        <div className="flex flex-wrap gap-4 sm:gap-6">
          {[
            { label: "Total Cards", value: stats.totalCards },
            { label: "Published", value: stats.published },
            { label: "Total Views", value: totalViews },
          ].map((stat) => (
            <div key={stat.label} className="min-w-[72px] text-center">
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
