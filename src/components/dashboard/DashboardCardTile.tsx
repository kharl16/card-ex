import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Share2, Copy, Trash2, Pencil, DollarSign, Eye } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface DashboardCardTileProps {
  card: CardData;
  onShare: (cardId: string, e: React.MouseEvent) => void;
  onDuplicate: (card: CardData, e: React.MouseEvent) => void;
  onDelete: (card: CardData, e: React.MouseEvent) => void;
  onRename: (card: CardData, e: React.MouseEvent) => void;
}

export function DashboardCardTile({ card, onShare, onDuplicate, onDelete, onRename }: DashboardCardTileProps) {
  const navigate = useNavigate();

  const theme = card.theme as any;
  const primaryColor = theme?.primary || "#D4AF37";
  const bgColor = theme?.background || "#0B0B0C";

  return (
    <div
      className="group relative w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-gold"
      onClick={() => navigate(`/cards/${card.id}/edit`)}
    >
      {/* Cover image */}
      <div
        className="relative h-28 w-full overflow-hidden sm:h-32"
        style={card.cover_url ? { backgroundColor: bgColor } : undefined}
      >
        {card.cover_url ? (
          <img
            src={card.cover_url}
            alt={`${card.full_name || "Card"} cover`}
            className="h-full w-full object-contain sm:object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${bgColor}, ${primaryColor}22)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 sm:via-card/40 to-transparent" />

        {/* Status badges */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {!card.is_paid && (
            <Badge variant="outline" className="border-destructive/40 bg-card/80 text-[10px] text-destructive backdrop-blur-sm">
              <DollarSign className="mr-0.5 h-2.5 w-2.5" />
              Unpaid
            </Badge>
          )}
          <div
            className={`h-2.5 w-2.5 rounded-full ring-2 ring-card ${card.is_published ? "bg-emerald-400" : "bg-muted-foreground/50"}`}
            title={card.is_published ? "Published" : "Unpublished"}
          />
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-5 left-4">
          {card.avatar_url ? (
            <img
              src={card.avatar_url}
              alt={card.full_name}
              className="h-14 w-14 rounded-full border-2 border-card object-cover shadow-md"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-card text-lg font-bold shadow-md"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}88)`, color: bgColor }}
            >
              {(card.full_name || "U")[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden px-4 pb-4 pt-8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                {card.full_name || "Untitled Card"}
              </h3>
              <button
                className="shrink-0 rounded p-0.5 text-muted-foreground opacity-100 transition-opacity hover:text-primary sm:opacity-0 sm:group-hover:opacity-100"
                title="Rename"
                onClick={(e) => onRename(card, e)}
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {card.title || "No title"} {card.company ? `· ${card.company}` : ""}
            </p>
          </div>
        </div>

        {/* Stats + Actions */}
        <div className="mt-3 border-t border-border/30 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground sm:text-sm">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-primary/70" />
                <span className="font-medium">{card.views_count || 0}</span>
              </span>
              <span className="min-w-0 truncate text-[10px] text-muted-foreground/60">/{card.slug}</span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {[
                { icon: TrendingUp, label: "Analytics", handler: (e: React.MouseEvent) => { e.stopPropagation(); navigate(`/cards/${card.id}/analytics`); } },
                { icon: Copy, label: "Duplicate", handler: (e: React.MouseEvent) => onDuplicate(card, e) },
                { icon: Share2, label: "Share", handler: (e: React.MouseEvent) => onShare(card.id, e) },
                { icon: Trash2, label: "Delete", handler: (e: React.MouseEvent) => onDelete(card, e), destructive: true },
              ].map(({ icon: Icon, label, handler, destructive }) => (
                <Button
                  key={label}
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 ${destructive ? "text-destructive hover:text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                  title={label}
                  onClick={handler}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
