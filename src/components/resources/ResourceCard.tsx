import { Heart, Download, ExternalLink, Play, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FileResource, EventType } from "@/types/resources";

interface ResourceCardProps {
  resource: FileResource;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLogEvent: (eventType: EventType) => void;
}

export function ResourceCard({
  resource,
  isFavorite,
  onToggleFavorite,
  onLogEvent,
}: ResourceCardProps) {
  const handleDownload = () => {
    if (resource.drive_link_download) {
      onLogEvent("download");
      window.open(resource.drive_link_download, "_blank");
    }
  };

  const handleView = () => {
    if (resource.drive_link_share) {
      onLogEvent("view");
      window.open(resource.drive_link_share, "_blank");
    }
  };

  const handleWatchVideo = () => {
    if (resource.view_video_url) {
      onLogEvent("watch");
      window.open(resource.view_video_url, "_blank");
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 bg-card/80 backdrop-blur border-border/50">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        {resource.images ? (
          <img
            src={resource.images}
            alt={resource.file_name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Eye className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* Folder badge */}
        {resource.folder_name && (
          <Badge className="absolute left-3 top-3 bg-black/70 text-white backdrop-blur text-sm px-3 py-1">
            {resource.folder_name}
          </Badge>
        )}

        {/* Favorite indicator (always visible) */}
        {isFavorite && (
          <div className="absolute right-3 top-3">
            <Heart className="h-7 w-7 fill-red-500 text-red-500 drop-shadow-lg" />
          </div>
        )}
      </div>

      <CardContent className="p-5">
        {/* Title - larger for senior readability */}
        <h3 className="font-semibold text-base md:text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
          {resource.file_name}
        </h3>
        
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {resource.description}
          </p>
        )}

        {/* Pricing - larger */}
        {(resource.price_dp || resource.price_srp) && (
          <div className="flex items-center gap-3 mb-4">
            {resource.price_dp && (
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                DP: {resource.price_dp}
              </Badge>
            )}
            {resource.price_srp && (
              <span className="text-sm text-muted-foreground">SRP: {resource.price_srp}</span>
            )}
          </div>
        )}

        {/* Action buttons - large tap targets (min 44px) */}
        <div className="flex flex-wrap gap-2">
          {resource.drive_link_download && (
            <Button
              size="lg"
              variant="default"
              className="h-12 gap-2 flex-1 min-w-[120px] text-base"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
              Download
            </Button>
          )}
          {resource.view_video_url && (
            <Button
              size="lg"
              variant="secondary"
              className="h-12 gap-2 flex-1 min-w-[100px] text-base"
              onClick={handleWatchVideo}
            >
              <Play className="h-5 w-5" />
              Watch
            </Button>
          )}
          {resource.drive_link_share && !resource.drive_link_download && !resource.view_video_url && (
            <Button
              size="lg"
              variant="outline"
              className="h-12 gap-2 flex-1 text-base"
              onClick={handleView}
            >
              <ExternalLink className="h-5 w-5" />
              Open
            </Button>
          )}
          <Button
            size="lg"
            variant="ghost"
            className={cn(
              "h-12 w-12 flex-shrink-0",
              isFavorite && "text-red-500"
            )}
            onClick={onToggleFavorite}
          >
            <Heart className={cn("h-6 w-6", isFavorite && "fill-current")} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
