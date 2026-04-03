import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface WelcomeBannerProps {
  profile: any;
  cards: CardData[];
}

export function WelcomeBanner({ profile, cards }: WelcomeBannerProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const name = profile?.full_name?.split(" ")[0] || "there";
  const publishedCount = cards.filter((c) => c.is_published).length;
  const totalViews = cards.reduce((sum, c) => sum + (c.views_count || 0), 0);

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {greeting}, <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{name}</span>
      </h1>
      <p className="text-sm text-muted-foreground sm:text-base">
        {cards.length === 0
          ? "Create your first digital business card to get started."
          : `${publishedCount} published · ${totalViews.toLocaleString()} total views`}
      </p>
    </div>
  );
}
