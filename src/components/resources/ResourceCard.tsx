import { Heart, Download, ExternalLink, Play, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FileResource, ResourceType, EventType } from "@/types/resources";

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
      <div className="relative aspect-square overflow-hidden bg-muted">
        {resource.images ? (
          <img
            src={resource.images}
            alt={resource.file_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Eye className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex gap-2">
              {resource.drive_link_download && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1"
                  onClick={handleDownload}
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              )}
              {resource.view_video_url && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1"
                  onClick={handleWatchVideo}
                >
                  <Play className="h-3 w-3" />
                  Watch
                </Button>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 rounded-full",
                isFavorite && "text-red-500"
              )}
              onClick={onToggleFavorite}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </Button>
          </div>
        </div>

        {/* Folder badge */}
        {resource.folder_name && (
          <Badge className="absolute left-2 top-2 bg-black/60 text-white backdrop-blur">
            {resource.folder_name}
          </Badge>
        )}

        {/* Favorite indicator (always visible) */}
        {isFavorite && (
          <div className="absolute right-2 top-2">
            <Heart className="h-5 w-5 fill-red-500 text-red-500 drop-shadow-lg" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {resource.file_name}
        </h3>
        
        {resource.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {resource.description}
          </p>
        )}

        {/* Pricing */}
        {(resource.price_dp || resource.price_srp) && (
          <div className="flex items-center gap-2 text-xs">
            {resource.price_dp && (
              <Badge variant="outline" className="font-mono">
                {resource.price_dp}
              </Badge>
            )}
            {resource.price_srp && (
              <span className="text-muted-foreground">{resource.price_srp}</span>
            )}
          </div>
        )}

        {/* View button */}
        {resource.drive_link_share && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full gap-2"
            onClick={handleView}
          >
            <ExternalLink className="h-3 w-3" />
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
