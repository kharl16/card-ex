import { Heart, Download, Play, User } from "lucide-react";
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
  const previewUrl = ambassador.drive_share_link || ambassador.video_file_url;
  const previewEventType: EventType = ambassador.drive_share_link ? "view" : "watch";

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 bg-card/80 backdrop-blur border-border/50 min-w-[200px] flex-shrink-0">
      <div className="relative aspect-square overflow-hidden bg-black">
        {ambassador.thumbnail ? (
          <img
            src={ambassador.thumbnail}
            alt={`${ambassador.endorser} - ${ambassador.product_endorsed}`}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <User className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex gap-2">
              {ambassador.drive_link && (
                <Button size="sm" variant="secondary" className="h-8" asChild>
                  <a
                    href={ambassador.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onLogEvent("download")}
                    aria-label={`Download ${ambassador.endorser || "ambassador"} file`}
                  >
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              )}
              {previewUrl && (
                <Button size="sm" variant="secondary" className="h-8" asChild>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onLogEvent(previewEventType)}
                    aria-label={`Open ${ambassador.endorser || "ambassador"} preview`}
                  >
                    <Play className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={cn("h-8 w-8 rounded-full", isFavorite && "text-destructive")}
              onClick={onToggleFavorite}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </Button>
          </div>
        </div>

        {isFavorite && (
          <div className="absolute right-2 top-2">
            <Heart className="h-5 w-5 text-destructive fill-current drop-shadow-lg" />
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
