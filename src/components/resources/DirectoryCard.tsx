import { MapPin, Phone, Clock, Facebook, ExternalLink, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DirectoryEntry, EventType } from "@/types/resources";

interface DirectoryCardProps {
  entry: DirectoryEntry;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLogEvent: (eventType: EventType) => void;
}

export function DirectoryCard({
  entry,
  isFavorite,
  onToggleFavorite,
  onLogEvent,
}: DirectoryCardProps) {
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
    <Card className="transition-all duration-300 hover:shadow-lg bg-card/80 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{entry.location}</CardTitle>
            {entry.sites && (
              <Badge variant="secondary" className="mt-1">
                {entry.sites}
              </Badge>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-8 w-8", isFavorite && "text-red-500")}
            onClick={onToggleFavorite}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {entry.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{entry.address}</span>
          </div>
        )}

        {entry.operating_hours && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{entry.operating_hours}</span>
          </div>
        )}

        {entry.owner && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Owner:</span> {entry.owner}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {phones.map((phone, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleCall(phone!)}
            >
              <Phone className="h-3 w-3" />
              {phone}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          {entry.maps_link && (
            <Button size="sm" variant="secondary" className="gap-1" onClick={handleMaps}>
              <MapPin className="h-3 w-3" />
              Maps
            </Button>
          )}
          {entry.facebook_page && (
            <Button size="sm" variant="secondary" className="gap-1" onClick={handleFacebook}>
              <Facebook className="h-3 w-3" />
              Facebook
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
