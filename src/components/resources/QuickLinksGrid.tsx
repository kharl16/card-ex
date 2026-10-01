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
            className="group relative overflow-hidden rounded-2xl border-primary/20 bg-background/80 backdrop-blur-md hover:border-primary/50 transition-all duration-300 hover:shadow-[0_16px_36px_-20px_hsl(var(--primary)/0.55)] hover:-translate-y-0.5"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="relative p-4 flex items-center gap-3">
              {/* Gold monogram */}
              <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/40 flex items-center justify-center shadow-[0_0_16px_-4px_hsl(var(--primary)/0.6)]">
                <span className="text-base font-bold text-primary">{link.name.trim().charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate text-foreground">{link.name}</h3>
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
