import { ExternalLink, Copy, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { IAMLink, EventType } from "@/types/resources";

interface QuickLinksGridProps {
  links: IAMLink[];
  favorites: Set<string>;
  onToggleFavorite: (linkId: string) => void;
  onLogEvent: (linkId: string, eventType: EventType) => void;
}

export function QuickLinksGrid({
  links,
  favorites,
  onToggleFavorite,
  onLogEvent,
}: QuickLinksGridProps) {
  const handleCopy = async (link: IAMLink) => {
    try {
      await navigator.clipboard.writeText(link.link);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {links.map((link) => {
        const isFavorite = favorites.has(link.id);
        return (
          <Card
            key={link.id}
            className="group relative overflow-hidden border-border/30 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative p-4 flex items-center gap-3">
              {/* Icon avatar */}
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center group-hover:border-primary/20 transition-colors">
                {link.icon_url ? (
                  <img src={link.icon_url} alt="" className="h-5 w-5 rounded" />
                ) : (
                  <ExternalLink className="h-4 w-4 text-primary/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{link.name}</h3>
                <p className="text-[10px] text-muted-foreground truncate">{link.link}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-primary/10"
                  onClick={() => handleCopy(link)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-primary/10"
                  asChild
                >
                  <a
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onLogEvent(link.id, "open_link")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", isFavorite && "text-red-500")}
                  onClick={() => onToggleFavorite(link.id)}
                >
                  <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
