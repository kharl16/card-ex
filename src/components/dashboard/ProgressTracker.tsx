import { useMemo } from "react";
import { Check, Circle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface ProgressTrackerProps {
  cards: CardData[];
  profile: any;
  cardViewsMap?: Record<string, number>;
}

interface Milestone {
  label: string;
  reached: boolean;
}

export function ProgressTracker({ cards, profile, cardViewsMap = {} }: ProgressTrackerProps) {
  const milestones = useMemo<Milestone[]>(() => {
    const hasCard = cards.length > 0;
    const hasAvatar = cards.some((c) => c.avatar_url);
    const hasPublished = cards.some((c) => c.is_published);
    const hasMultiple = cards.length >= 2;
    const has10Views = cards.some((c) => (cardViewsMap[c.id] || 0) >= 10);

    return [
      { label: "Create first card", reached: hasCard },
      { label: "Add a photo", reached: hasAvatar },
      { label: "Publish a card", reached: hasPublished },
      { label: "Reach 10 views", reached: has10Views },
      { label: "Create 2 cards", reached: hasMultiple },
    ];
  }, [cards, cardViewsMap]);

  const completedCount = milestones.filter((m) => m.reached).length;
  const progress = (completedCount / milestones.length) * 100;

  if (completedCount === milestones.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Getting Started</h3>
        <span className="text-xs font-bold text-primary">
          {completedCount}/{milestones.length}
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            {m.reached ? (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Check className="h-3 w-3 text-primary" />
              </div>
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30">
                <Circle className="h-2.5 w-2.5 text-muted-foreground/40" />
              </div>
            )}
            <span
              className={`text-xs font-medium ${
                m.reached ? "text-foreground/60 line-through" : "text-foreground"
              }`}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
