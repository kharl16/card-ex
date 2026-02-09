import { Heart, Download, ExternalLink, Play, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Ambassador, EventType } from "@/types/resources";

interface AmbassadorCardProps {
  ambassador: Ambassador;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLogEvent: (eventType: EventType) => void;
}

export function AmbassadorCard({
  ambassador,
  isFavorite,
  onToggleFavorite,
  onLogEvent,
}: AmbassadorCardProps) {
  const handleDownload = () => {
    if (ambassador.drive_link) {
      onLogEvent("download");
      window.open(ambassador.drive_link, "_blank");
    }
  };

  const handleWatch = () => {
    if (ambassador.video_file_url) {
      onLogEvent("watch");
      window.open(ambassador.video_file_url, "_blank");
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 bg-card/80 backdrop-blur border-border/50 min-w-[200px] flex-shrink-0">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {ambassador.thumbnail ? (
          <img
            src={ambassador.thumbnail}
            alt={`${ambassador.endorser} - ${ambassador.product_endorsed}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <User className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex gap-2">
              {ambassador.drive_link && (
                <Button size="sm" variant="secondary" className="h-8" onClick={handleDownload}>
                  <Download className="h-3 w-3" />
                </Button>
              )}
              {ambassador.video_file_url && (
                <Button size="sm" variant="secondary" className="h-8" onClick={handleWatch}>
                  <Play className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={cn("h-8 w-8 rounded-full", isFavorite && "text-red-500")}
              onClick={onToggleFavorite}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </Button>
          </div>
        </div>

        {isFavorite && (
          <div className="absolute right-2 top-2">
            <Heart className="h-5 w-5 fill-red-500 text-red-500 drop-shadow-lg" />
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-semibold text-sm line-clamp-1">{ambassador.endorser}</h3>
        {ambassador.product_endorsed && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {ambassador.product_endorsed}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
