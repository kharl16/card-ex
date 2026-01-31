import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Navigation, Facebook, Clock, Route, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Fix for default marker icons in react-leaflet - use a flag to avoid running multiple times
const fixLeafletIcons = () => {
  if (typeof window !== 'undefined' && !(window as any).__leafletIconsFixed) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
    (window as any).__leafletIconsFixed = true;
  }
};

// IMPORTANT: Avoid side effects at module import time.
// We call fixLeafletIcons() inside the component (useEffect) instead.

function svgToDataUrl(svg: string) {
  // Avoid btoa(): it can be unavailable / polyfilled differently in some environments.
  // URI-encoding SVG is broadly safe for browsers.
  const encoded = encodeURIComponent(svg).replace(/%0A/g, "");
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

interface DirectoryEntry {
  id: number;
  location: string | null;
  address: string | null;
  maps_link: string | null;
  owner: string | null;
  facebook_page: string | null;
  operating_hours: string | null;
  phone_1: string | null;
  phone_2: string | null;
  phone_3: string | null;
  sites: string | null;
  is_active: boolean;
}

interface LocationWithCoords extends DirectoryEntry {
  coords: { lat: number; lng: number };
}

interface DirectoryMapViewProps {
  items: DirectoryEntry[];
  userLocation: { lat: number; lng: number } | null;
  onSelectEntry: (entry: DirectoryEntry) => void;
  extractCoordsFromUrl: (url: string | null) => { lat: number; lng: number } | null;
}

// Component to recenter map when locations change
function MapBoundsHandler({ locations, userLocation }: { locations: LocationWithCoords[]; userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0 && !userLocation) return;

    const points: L.LatLngExpression[] = locations.map((loc) => [loc.coords.lat, loc.coords.lng]);
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, userLocation, map]);

  return null;
}

export default function DirectoryMapView({
  items,
  userLocation,
  onSelectEntry,
  extractCoordsFromUrl,
}: DirectoryMapViewProps) {
  const [selectedMarker, setSelectedMarker] = useState<DirectoryEntry | null>(null);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const icons = useMemo(() => {
    const goldSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="#D4AF37"/>
        <circle cx="12" cy="12" r="5" fill="#0B0B0C"/>
      </svg>
    `.trim();

    const userSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="3"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `.trim();

    return {
      gold: new L.Icon({
        iconUrl: svgToDataUrl(goldSvg),
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36],
      }),
      user: new L.Icon({
        iconUrl: svgToDataUrl(userSvg),
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    };
  }, []);

  // Filter items that have valid coordinates
  const locationsWithCoords = useMemo(() => {
    const result: LocationWithCoords[] = [];
    
    items.forEach((item) => {
      const coords = extractCoordsFromUrl(item.maps_link);
      if (coords) {
        result.push({ ...item, coords });
      }
    });
    
    return result;
  }, [items, extractCoordsFromUrl]);

  // Default center (Philippines)
  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng]
    : locationsWithCoords.length > 0 
      ? [locationsWithCoords[0].coords.lat, locationsWithCoords[0].coords.lng]
      : [14.5995, 120.9842]; // Manila

  const itemsWithoutCoords = items.length - locationsWithCoords.length;

  const handleGetDirections = (entry: DirectoryEntry) => {
    if (entry.maps_link) {
      const navUrl = entry.maps_link.includes("?")
        ? `${entry.maps_link}&dir_action=navigate`
        : `${entry.maps_link}?dir_action=navigate`;
      window.open(navUrl, "_blank");
    }
  };

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full z-0"
        scrollWheelZoom={true}
        style={{ background: "hsl(var(--muted))" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsHandler locations={locationsWithCoords} userLocation={userLocation} />

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={icons.user}>
            <Popup>
              <div className="text-center font-medium">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Branch markers */}
        {locationsWithCoords.map((item) => (
          <Marker
            key={item.id}
            position={[item.coords.lat, item.coords.lng]}
            icon={icons.gold}
            eventHandlers={{
              click: () => setSelectedMarker(item),
            }}
          >
            <Popup>
              <div className="min-w-[200px] max-w-[280px]">
                <h4 className="font-semibold text-sm mb-1">{item.location}</h4>
                {item.sites && (
                  <span className="inline-block text-xs px-2 py-0.5 bg-muted rounded-full mb-2">
                    {item.sites}
                  </span>
                )}
                {item.address && (
                  <p className="text-xs text-muted-foreground mb-2">{item.address}</p>
                )}
                {item.operating_hours && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" />
                    {item.operating_hours}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onSelectEntry(item)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    View Details
                  </button>
                  {item.maps_link && (
                    <button
                      onClick={() => handleGetDirections(item)}
                      className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <Route className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Info badge for locations without coords */}
      {itemsWithoutCoords > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <div className="bg-background/95 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>
              {itemsWithoutCoords} location{itemsWithoutCoords !== 1 ? "s" : ""} not shown (no map coordinates)
            </span>
          </div>
        </div>
      )}

      {/* Selected marker card (mobile-friendly bottom sheet style) */}
      {selectedMarker && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-3 sm:p-4 animate-slide-up">
          <div className="bg-card border border-border rounded-xl shadow-lg p-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => setSelectedMarker(null)}
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center",
                "bg-gradient-to-br from-primary/20 to-primary/5",
                "border border-primary/20"
              )}>
                <MapPin className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <h4 className="font-semibold text-foreground truncate">
                  {selectedMarker.location || "Unknown Location"}
                </h4>
                {selectedMarker.address && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMarker.address}
                  </p>
                )}
                {selectedMarker.sites && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {selectedMarker.sites}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {selectedMarker.phone_1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1"
                  onClick={() => window.open(`tel:${selectedMarker.phone_1}`, "_self")}
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call</span>
                </Button>
              )}
              {selectedMarker.maps_link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1"
                  onClick={() => handleGetDirections(selectedMarker)}
                >
                  <Route className="w-4 h-4" />
                  <span className="hidden sm:inline">Directions</span>
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                className="h-10 gap-1 bg-primary text-primary-foreground"
                onClick={() => {
                  onSelectEntry(selectedMarker);
                  setSelectedMarker(null);
                }}
              >
                <Navigation className="w-4 h-4" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
