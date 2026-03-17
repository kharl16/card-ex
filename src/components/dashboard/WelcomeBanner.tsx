import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface WelcomeBannerProps {
  profile: any;
  cards: CardData[];
}

export function WelcomeBanner({ profile, cards }: WelcomeBannerProps) {
  const stats = useMemo(() => {
    const totalViews = cards.reduce((sum, c) => sum + (c.views_count || 0), 0);
    const published = cards.filter((c) => c.is_published).length;
    return { totalViews, totalCards: cards.length, published };
  }, [cards]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const name = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-accent/30 p-6 md:p-8">
      {/* Decorative gold accent */}
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {greeting}, <span className="text-primary">{name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's an overview of your digital presence
          </p>
        </div>

        <div className="flex gap-6">
          {[
            { label: "Total Cards", value: stats.totalCards },
            { label: "Published", value: stats.published },
            { label: "Total Views", value: stats.totalViews },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
