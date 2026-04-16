import { Heart, Play, Eye, Tag } from "lucide-react";
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

  return (
    <div
      className="group relative overflow-hidden rounded-xl bg-card border border-border/30 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/20"
      onClick={onClick}
    >
      {/* Image */}
      <div className={cn("relative overflow-hidden", compact ? "aspect-square" : "aspect-[3/4]")}>
        {resource.images ? (
          <img
            src={resource.images}
            alt={resource.file_name}
            className="h-full w-full object-contain bg-black/90 transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
            <Eye className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />

        {/* Favorite button */}
        <button
          className={cn(
            "absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-md transition-all duration-200",
            "bg-black/30 hover:bg-black/50",
            "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100",
            isFavorite && "opacity-100 scale-100"
          )}
          onClick={handleFavClick}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5 transition-all duration-200",
              isFavorite ? "fill-red-500 text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" : "text-white/80"
            )}
          />
        </button>

        {/* Price badge */}
        {resource.price_dp && (
          <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground backdrop-blur-md text-[9px] px-1.5 py-0.5 font-mono border-0 shadow-lg shadow-primary/20">
            DP: {resource.price_dp}
          </Badge>
        )}

        {/* Video indicator */}
        {resource.view_video_url && (
          <div className="absolute top-2 left-2 mt-6 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <Play className="h-3 w-3 text-white fill-white" />
          </div>
        )}

        {/* Bottom text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
          <h3 className="font-medium text-white text-[11px] leading-snug line-clamp-2 drop-shadow-lg">
            {resource.file_name}
          </h3>
          {!compact && resource.folder_name && (
            <p className="text-[9px] text-white/50 mt-0.5 truncate flex items-center gap-1">
              <Tag className="h-2.5 w-2.5" />
              {resource.folder_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
