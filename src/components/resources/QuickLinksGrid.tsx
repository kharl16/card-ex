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

  const handleOpen = (link: IAMLink) => {
    onLogEvent(link.id, "open_link");
    window.open(link.link, "_blank");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {links.map((link) => {
        const isFavorite = favorites.has(link.id);
        return (
          <Card
            key={link.id}
            className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 bg-card/80 backdrop-blur border-border/50"
          >
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{link.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{link.link}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleCopy(link)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleOpen(link)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", isFavorite && "text-red-500")}
                  onClick={() => onToggleFavorite(link.id)}
                >
                  <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
