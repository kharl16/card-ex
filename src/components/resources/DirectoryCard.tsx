import { MapPin, Phone, Clock, Facebook, Heart, Navigation } from "lucide-react";
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-xl md:text-2xl leading-tight">{entry.location}</CardTitle>
            {entry.sites && (
              <Badge variant="secondary" className="mt-2 text-sm px-3 py-1">
                {entry.sites}
              </Badge>
            )}
          </div>
          <Button
            size="lg"
            variant="ghost"
            className={cn("h-12 w-12 flex-shrink-0", isFavorite && "text-red-500")}
            onClick={onToggleFavorite}
          >
            <Heart className={cn("h-6 w-6", isFavorite && "fill-current")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {entry.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
            <span className="text-base text-muted-foreground leading-relaxed">{entry.address}</span>
          </div>
        )}

        {entry.operating_hours && (
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-base text-muted-foreground">{entry.operating_hours}</span>
          </div>
        )}

        {entry.owner && (
          <p className="text-base text-muted-foreground">
            <span className="font-semibold text-foreground">Owner:</span> {entry.owner}
          </p>
        )}

        {/* Primary Call Buttons - Large tap targets */}
        {phones.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Tap to call:</p>
            <div className="flex flex-col gap-2">
              {phones.map((phone, idx) => (
                <Button
                  key={idx}
                  size="lg"
                  variant="default"
                  className="h-14 gap-3 text-base justify-start"
                  onClick={() => handleCall(phone!)}
                >
                  <Phone className="h-5 w-5" />
                  {phone}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Actions */}
        <div className="flex gap-3 pt-2">
          {entry.maps_link && (
            <Button 
              size="lg" 
              variant="secondary" 
              className="h-12 gap-2 flex-1 text-base" 
              onClick={handleMaps}
            >
              <Navigation className="h-5 w-5" />
              Maps
            </Button>
          )}
          {entry.facebook_page && (
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 gap-2 flex-1 text-base" 
              onClick={handleFacebook}
            >
              <Facebook className="h-5 w-5" />
              Facebook
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
