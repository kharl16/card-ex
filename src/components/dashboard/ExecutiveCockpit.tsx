import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowUpRight, Eye, Pencil, Plus, Share2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getPublicCardUrl } from "@/lib/cardUrl";
import { Button } from "@/components/ui/button";
import { AnimatedStatsCards } from "./AnimatedStatsCards";
import { WelcomeBanner } from "./WelcomeBanner";

type CardData = Tables<"cards">;

interface ExecutiveCockpitProps {
  profile: unknown;
  cards: CardData[];
  primaryCard: CardData | null;
  primaryCardViews: number;
  onShare: (cardId: string, event: MouseEvent) => void;
  onCreateCard: () => void;
  loading?: boolean;
  error?: boolean;
}

export function ExecutiveCockpit({
  profile,
  cards,
  primaryCard,
  primaryCardViews,
  onShare,
  onCreateCard,
  loading = false,
  error = false,
}: ExecutiveCockpitProps) {
  const navigate = useNavigate();
  const isLive = Boolean(primaryCard?.is_published);
  const cardDetails = (
    <>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 sm:px-3 sm:py-1.5">
        <Eye className="h-4 w-4 text-primary" aria-hidden />
        {primaryCardViews.toLocaleString()} total views
      </span>
      <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 sm:px-3 sm:py-1.5">
        {isLive ? "Visible to everyone" : "Only you can see this draft"}
      </span>
    </>
  );

  return (
    <section
      aria-label="Executive dashboard overview"
      data-executive-cockpit
      className="dashboard-cockpit relative isolate overflow-hidden rounded-[28px] border border-primary/30"
    >
      <div
        aria-hidden
        className="guilloche-rosette -right-20 -top-20 z-0 w-72 sm:w-96"
        style={{ ["--guilloche-strength" as string]: 0.11 }}
      />

      <div className="relative z-10 space-y-3 p-3 sm:space-y-5 sm:p-6">
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <WelcomeBanner profile={profile} cards={cards} compact />
          <div className={`${!loading && !error ? "absolute right-0 -top-1 sm:static" : ""} flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-background/70 px-2 py-0.5 sm:min-h-11 sm:gap-2.5 sm:px-4 sm:py-2 backdrop-blur-xl`}>
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
              {isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold text-foreground sm:text-sm">
              {loading
                ? "Syncing your dashboard"
                : error
                  ? "Connection needs attention"
                  : primaryCard
                    ? (isLive ? "Active · Published" : "Main card · Draft")
                    : "Ready to begin"}
            </span>
          </div>
        </div>

        {cards.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Activity className="h-4 w-4" aria-hidden />
              Live activity
            </div>
            <AnimatedStatsCards cards={cards} variant="cockpit" />
          </div>
        )}

        {loading ? (
          <div className="h-56 animate-pulse rounded-3xl border border-primary/20 bg-primary/5" aria-label="Loading your main card" />
        ) : error ? (
          <div className="rounded-3xl border border-primary/25 bg-background/60 p-5" role="status">
            <h2 className="text-xl font-semibold text-foreground">Your cards are safely saved</h2>
            <p className="mt-1 text-base text-muted-foreground">Use Retry below to reconnect and bring back your live overview.</p>
          </div>
        ) : primaryCard ? (
          <article className="relative overflow-hidden rounded-3xl border border-primary/30 bg-background/75 shadow-luxury">
            {primaryCard.cover_url && (
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <img
                  src={primaryCard.cover_url}
                  alt=""
                  className="h-full w-full object-cover opacity-25"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/45" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
              </div>
            )}

            <div className="relative grid gap-3 p-3 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                {primaryCard.avatar_url ? (
                  <img
                    src={primaryCard.avatar_url}
                    alt={primaryCard.full_name || "Card owner"}
                    className="h-14 w-14 shrink-0 rounded-2xl border border-primary/50 object-cover shadow-gold sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/50 bg-primary/15 text-3xl font-bold text-primary sm:h-24 sm:w-24">
                    {(primaryCard.full_name || "C")[0].toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your main card</p>
                  <h2 className="break-words text-xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {primaryCard.full_name || "Untitled Card"}
                  </h2>
                  <p className="mt-0.5 break-words text-base text-foreground/75 sm:mt-1">
                    {[primaryCard.title, primaryCard.company].filter(Boolean).join(" · ") || "Your digital business card"}
                  </p>
                  <div className="mt-3 hidden flex-wrap items-center gap-2 text-sm text-muted-foreground sm:flex">
                    {cardDetails}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 lg:w-[330px]">
                <Button
                  type="button"
                  onClick={(event) => onShare(primaryCard.id, event)}
                  className="h-12 min-w-0 gap-1.5 rounded-xl px-2 text-sm font-semibold sm:px-3"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/cards/${primaryCard.id}/edit`)}
                  className="h-12 min-w-0 gap-1.5 rounded-xl border-primary/40 bg-background/70 px-2 text-sm font-semibold sm:px-3"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isLive}
                  title={isLive ? "Open your public card" : "Publish this card to view it"}
                  onClick={() => window.open(
                    getPublicCardUrl(primaryCard.custom_slug || primaryCard.slug, Boolean(primaryCard.custom_slug)),
                    "_blank",
                    "noopener,noreferrer",
                  )}
                  className="h-12 min-w-0 gap-1.5 rounded-xl border-primary/40 bg-background/70 px-2 text-sm font-semibold sm:px-3"
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                  View
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground sm:hidden">
                {cardDetails}
              </div>
            </div>
          </article>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-primary/35 bg-background/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Your main card belongs here</h2>
              <p className="mt-1 text-base text-muted-foreground">Create it once, then share it anywhere.</p>
            </div>
            <Button type="button" onClick={onCreateCard} className="h-12 w-full rounded-xl sm:w-auto">
              <Plus className="h-5 w-5" aria-hidden />
              Create your card
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
