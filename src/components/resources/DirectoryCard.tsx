import { MapPin, Phone, Clock, Facebook, Heart, Navigation, Eye, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DirectoryEntry, EventType } from "@/types/resources";
import { useState } from "react";

interface DirectoryCardProps {
  entry: DirectoryEntry;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLogEvent: (eventType: EventType) => void;
  onView?: () => void;
}

export function DirectoryCard({
  entry,
  isFavorite,
  onToggleFavorite,
  onLogEvent,
  onView,
}: DirectoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleCall = (phone: string) => {
    onLogEvent("call");
    window.open(`tel:${phone.replace(/[^+\d]/g, "")}`, "_self");
  };

  const handleMaps = () => {
    if (entry.maps_link) {
      onLogEvent("open_maps");
      window.open(entry.maps_link, "_blank");
    }
  };

  const handleFacebook = () => {
    if (entry.facebook_page) {
      onLogEvent("open_link");
      window.open(entry.facebook_page, "_blank");
    }
  };

  const phones = [entry.phone_1, entry.phone_2, entry.phone_3].filter(Boolean);

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-border/40 bg-card shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Owner photo header */}
      <div className="relative h-72 md:h-80 overflow-hidden">
        <div className="relative w-full h-full overflow-hidden bg-muted/80">
          {entry.owner_photo_url ? (
            <img
              src={entry.owner_photo_url}
              alt={entry.owner || "Owner"}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/80">
              <User className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

        {/* Favorite button */}
        <button
          className={cn(
            "absolute top-2 right-2 z-10 p-1.5 rounded-full bg-card/70 backdrop-blur-sm border border-border/30 transition-colors",
            isFavorite ? "text-red-500" : "text-muted-foreground hover:text-red-400"
          )}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>

        {/* Site badge */}
        {entry.sites && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 z-10 text-xs px-2 py-0.5 bg-primary/90 text-primary-foreground border-0"
          >
            {entry.sites}
          </Badge>
        )}

        {/* Location title overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-3 pb-2">
          <h3 className="text-base font-bold leading-tight text-foreground truncate">
            {entry.location}
          </h3>
        </div>
      </div>

      {/* Compact info */}
      <div className="px-3 pt-2 pb-3 space-y-1.5">
        {entry.address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground leading-snug line-clamp-2">{entry.address}</span>
          </div>
        )}

        {entry.owner && (
          <div className="flex items-center gap-2">
            {entry.owner_photo_url ? (
              <img src={entry.owner_photo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
            ) : (
              <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            )}
            <span className="text-xs text-muted-foreground">{entry.owner}</span>
          </div>
        )}

        {entry.operating_hours && (
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">{entry.operating_hours}</span>
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex items-center gap-1.5 pt-2">
          {phones.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs flex-1"
              onClick={(e) => { e.stopPropagation(); handleCall(phones[0]!); }}
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
          )}
          {entry.maps_link && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs flex-1"
              onClick={(e) => { e.stopPropagation(); handleMaps(); }}
            >
              <Navigation className="h-3.5 w-3.5" />
              Maps
            </Button>
          )}
          {entry.facebook_page && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs flex-1"
              onClick={(e) => { e.stopPropagation(); handleFacebook(); }}
            >
              <Facebook className="h-3.5 w-3.5" />
              FB
            </Button>
          )}
          {onView && (
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs flex-1"
              onClick={(e) => { e.stopPropagation(); onView(); }}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
          )}
        </div>

        {/* Expanded: extra phone numbers */}
        {expanded && phones.length > 1 && (
          <div className="pt-1 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
            {phones.slice(1).map((phone, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="secondary"
                className="w-full h-8 gap-2 text-xs justify-start"
                onClick={(e) => { e.stopPropagation(); handleCall(phone!); }}
              >
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
