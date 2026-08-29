import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getZonedParts } from "@/hooks/useBibleWisdom";

type CardData = Tables<"cards">;

interface WelcomeBannerProps {
  profile: any;
  cards: CardData[];
}

export function WelcomeBanner({ profile, cards }: WelcomeBannerProps) {
  const [totalViews, setTotalViews] = useState(0);

  // Ticks every minute but only re-renders when the slot boundary is crossed,
  // so the greeting flips at the exact same moment the quote/verse rotates.
  const [greeting, setGreeting] = useState(() => {
    const { hour } = getZonedParts(new Date());
    if (hour < 12) return "Amazing morning";
    if (hour < 18) return "Amazing afternoon";
    return "Amazing evening";
  });
  useEffect(() => {
    const compute = () => {
      const { hour } = getZonedParts(new Date());
      if (hour < 12) return "Amazing morning";
      if (hour < 18) return "Amazing afternoon";
      return "Amazing evening";
    };
    const id = setInterval(() => {
      setGreeting((prev) => {
        const next = compute();
        return prev === next ? prev : next;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const name = profile?.full_name?.split(" ")[0] || "there";
  const publishedCount = cards.filter((c) => c.is_published).length;

  useEffect(() => {
    if (cards.length === 0) return;
    const cardIds = cards.map((c) => c.id);
    supabase
      .from("analytics_daily")
      .select("views")
      .in("card_id", cardIds)
      .then(({ data }) => {
        const sum = (data || []).reduce((acc, row) => acc + (row.views || 0), 0);
        setTotalViews(sum);
      });
  }, [cards]);

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Dashboard</p>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl break-words">
        {greeting},{" "}
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent break-words">
          {name}
        </span>
      </h1>
      {cards.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {publishedCount} published · {totalViews.toLocaleString()} views
        </p>
      )}
    </div>
  );
}
