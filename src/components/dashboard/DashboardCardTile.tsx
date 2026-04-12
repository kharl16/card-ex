import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2, Pencil, Copy, Trash2, Eye, ExternalLink } from "lucide-react";
import { getPublicCardUrl } from "@/lib/cardUrl";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface DashboardCardTileProps {
  card: CardData;
  analyticsViews?: number | null;
  onShare: (cardId: string, e: React.MouseEvent) => void;
  onDuplicate: (card: CardData, e: React.MouseEvent) => void;
  onDelete: (card: CardData, e: React.MouseEvent) => void;
  onRename: (card: CardData, e: React.MouseEvent) => void;
}

export function DashboardCardTile({ card, analyticsViews, onShare, onDuplicate, onDelete, onRename }: DashboardCardTileProps) {
  const navigate = useNavigate();
  const theme = card.theme as any;
  const primaryColor = theme?.primary || "#D4AF37";
  const bgColor = theme?.background || "#0B0B0C";

  return (
    <div
      className="group relative flex w-full cursor-pointer items-stretch overflow-hidden rounded-2xl border border-border/30 bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
      onClick={() => navigate(`/cards/${card.id}/edit`)}
    >
      {/* Left: Avatar strip */}
      <div
        className="relative flex w-20 shrink-0 items-center justify-center sm:w-24"
        style={{ background: `linear-gradient(180deg, ${bgColor}, ${primaryColor}22)` }}
      >
        {card.avatar_url ? (
          <img
            src={card.avatar_url}
            alt={card.full_name}
            className="h-14 w-14 rounded-full border-2 border-background/50 object-cover shadow-md sm:h-16 sm:w-16"
          />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-background/50 text-xl font-bold shadow-md sm:h-16 sm:w-16"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}88)`, color: bgColor }}
          >
            {(card.full_name || "U")[0].toUpperCase()}
          </div>
        )}
        {/* Published dot */}
        <div
          className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-card ${card.is_published ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
          title={card.is_published ? "Published" : "Draft"}
        />
      </div>

      {/* Right: Info + actions */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-4">
        {/* Name & title */}
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold leading-tight text-foreground">
            {card.full_name || "Untitled Card"}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {card.title || "No title"}{card.company ? ` · ${card.company}` : ""}
          </p>
        </div>

        {/* Bottom row: views + actions */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5 text-primary/60" />
            <span className="font-medium">{analyticsViews != null ? analyticsViews : (card.views_count || 0)} views</span>
          </span>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
              title="View Card"
              onClick={(e) => {
                e.stopPropagation();
                window.open(getPublicCardUrl(card.custom_slug || card.slug), "_blank");
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
              title="Share"
              onClick={(e) => onShare(card.id, e)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Rename"
              onClick={(e) => onRename(card, e)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Duplicate"
              onClick={(e) => onDuplicate(card, e)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive/70 hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Delete"
              onClick={(e) => onDelete(card, e)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
