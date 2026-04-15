import { Heart, Download, ExternalLink, Play, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FileResource, EventType } from "@/types/resources";

interface ResourceCardProps {
  resource: FileResource;
  compact?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLogEvent: (eventType: EventType) => void;
  onClick?: () => void;
}

export function ResourceCard({
  resource,
  compact = false,
  isFavorite,
  onToggleFavorite,
  onLogEvent,
  onClick,
}: ResourceCardProps) {
  const handleFavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  // Compact overlay card — used in grids
  return (
    <div
      className="group relative overflow-hidden rounded-xl bg-black cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Image */}
      <div className={cn("relative overflow-hidden", compact ? "aspect-square" : "aspect-[3/4]")}>
        {resource.images ? (
          <img
            src={resource.images}
            alt={resource.file_name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Eye className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Favorite button - top right */}
        <button
          className={cn(
            "absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm transition-all",
            "opacity-0 group-hover:opacity-100",
            isFavorite && "opacity-100"
          )}
          onClick={handleFavClick}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite ? "fill-red-500 text-red-500" : "text-white"
            )}
          />
        </button>

        {/* Price badge - top left */}
        {resource.price_dp && (
          <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground backdrop-blur-sm text-[10px] px-2 py-0.5 font-mono">
            DP: {resource.price_dp}
          </Badge>
        )}

        {/* Video indicator */}
        {resource.view_video_url && (
          <div className="absolute top-2 left-2 mt-6 bg-black/50 backdrop-blur-sm rounded-full p-1">
            <Play className="h-3 w-3 text-white fill-white" />
          </div>
        )}

        {/* Bottom text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <h3 className="font-medium text-white text-xs leading-snug line-clamp-2 drop-shadow-lg">
            {resource.file_name}
          </h3>
          {!compact && resource.folder_name && (
            <p className="text-[10px] text-white/60 mt-1 truncate">
              {resource.folder_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
