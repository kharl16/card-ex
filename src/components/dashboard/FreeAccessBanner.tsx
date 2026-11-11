import { useNavigate } from "react-router-dom";
import { Gift, Clock, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFreeAccessState, daysLeftLabel, FREE_ACCESS_DAYS, type FreeAccessCard } from "@/lib/freeAccess";
import { cn } from "@/lib/utils";

interface FreeAccessBannerProps {
  card: (FreeAccessCard & { id: string }) | null | undefined;
  className?: string;
}

/** Countdown / reminder / ended notice for a card's 7-day free access. Renders nothing for paid cards. */
export function FreeAccessBanner({ card, className }: FreeAccessBannerProps) {
  const navigate = useNavigate();
  const state = getFreeAccessState(card);
  if (!card || state.status === "paid" || state.status === "none") return null;

  const activate = () => navigate(`/billing/${card.id}`);

  const content =
    state.status === "expired"
      ? {
          Icon: PauseCircle,
          title: "Your 7-day free access has ended",
          body: "Your photos, contact details and designs are all saved. Activate your plan to turn your card back on.",
        }
      : state.status === "ending"
        ? {
            Icon: Clock,
            title: `${daysLeftLabel(state.daysLeft)} of your free access`,
            body: "Activate now to keep your card link live for everyone you've shared it with.",
          }
        : {
            Icon: Gift,
            title: `${FREE_ACCESS_DAYS}-Day Free Access · ${daysLeftLabel(state.daysLeft)}`,
            body: "Publish, share and use every Card-Ex feature free this week.",
          };

  const { Icon } = content;
  const urgent = state.status !== "active";

  return (
    <div
      role="status"
      className={cn(
        "glass-shimmer relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 sm:flex-row sm:items-center",
        urgent ? "border-primary/60" : "border-primary/30",
        className,
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <Icon className={cn("mt-0.5 h-7 w-7 shrink-0", urgent ? "text-primary" : "text-primary/80")} aria-hidden />
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">{content.title}</p>
          <p className="text-sm text-muted-foreground">{content.body}</p>
        </div>
      </div>
      <Button onClick={activate} className="h-11 w-full shrink-0 rounded-full px-6 font-semibold sm:w-auto">
        Activate Plan
      </Button>
    </div>
  );
}
