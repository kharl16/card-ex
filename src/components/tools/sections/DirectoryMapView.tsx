import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";


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
  owner_photo_url: string | null;
  location_image_url: string | null;
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

// Toggles a CSS class on the map container based on zoom level so we can
// hide permanent name labels at low zoom (prevents label overlap/cutoff).
function MapZoomClass({ threshold = 11 }: { threshold?: number }) {
  const map = useMapEvents({
    zoomend: () => {
      const el = map.getContainer();
      if (map.getZoom() < threshold) el.classList.add("map-zoom-low");
      else el.classList.remove("map-zoom-low");
    },
  });
  useEffect(() => {
    const el = map.getContainer();
    if (map.getZoom() < threshold) el.classList.add("map-zoom-low");
    else el.classList.remove("map-zoom-low");
  }, [map, threshold]);
  return null;
}

export default function DirectoryMapView({
  items,
  userLocation,
  onSelectEntry,
  extractCoordsFromUrl,
}: DirectoryMapViewProps) {
  // No internal detail sheet — clicking a pin opens the parent detail modal directly.

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

  // Geocoded fallback cache for entries whose maps_link lacks parseable coords
  // (e.g. shortened maps.app.goo.gl URLs). Keyed by entry id.
  const [geocoded, setGeocoded] = useState<Record<number, { lat: number; lng: number }>>({});

  // Resolve coords: first try URL parse, then fall back to geocoded cache
  const locationsWithCoords = useMemo(() => {
    const result: LocationWithCoords[] = [];
    items.forEach((item) => {
      const parsed = extractCoordsFromUrl(item.maps_link);
      const fallback = geocoded[item.id];
      const coords = parsed ?? fallback;
      if (/nueva\s*vizcaya/i.test(item.location ?? "") || /nueva\s*vizcaya/i.test(item.address ?? "")) {
        console.log("[DirectoryMap] Nueva Vizcaya entry", {
          id: item.id,
          location: item.location,
          address: item.address,
          maps_link: item.maps_link,
          parsedFromUrl: parsed,
          geocodedFallback: fallback,
          finalCoords: coords,
        });
      }
      if (coords) result.push({ ...item, coords });
    });
    return result;
  }, [items, extractCoordsFromUrl, geocoded]);

  // Geocode entries that have no coords yet via OpenStreetMap Nominatim.
  // Uses address (preferred) or location name, appended with "Philippines" hint.
  useEffect(() => {
    const pending = items.filter(
      (i) => !extractCoordsFromUrl(i.maps_link) && geocoded[i.id] === undefined
    );
    console.log(
      "[DirectoryMap] geocoding pending count:",
      pending.length,
      pending.map((p) => ({ id: p.id, location: p.location, maps_link: p.maps_link }))
    );
    if (pending.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const item of pending) {
        const q = [item.address, item.location].filter(Boolean).join(", ");
        if (!q) {
          console.warn("[DirectoryMap] skip geocode — empty query", { id: item.id });
          continue;
        }
        const fullQuery = q + ", Philippines";
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullQuery)}`;
          console.log("[DirectoryMap] geocoding →", { id: item.id, location: item.location, query: fullQuery });
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) {
            console.warn("[DirectoryMap] geocode HTTP error", { id: item.id, status: res.status });
            continue;
          }
          const data = (await res.json()) as Array<{ lat: string; lon: string }>;
          if (cancelled) return;
          console.log("[DirectoryMap] geocode result", {
            id: item.id,
            location: item.location,
            resultCount: data.length,
            raw: data[0],
          });
          if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              console.log("[DirectoryMap] geocode ✓ saved", { id: item.id, location: item.location, lat, lng });
              setGeocoded((prev) => ({ ...prev, [item.id]: { lat, lng } }));
            } else {
              console.warn("[DirectoryMap] geocode parse failed", { id: item.id, raw: data[0] });
            }
          } else {
            console.warn("[DirectoryMap] geocode ✗ no results", { id: item.id, query: fullQuery });
          }
          // Be polite to Nominatim's 1 req/sec policy
          await new Promise((r) => setTimeout(r, 1100));
        } catch (err) {
          console.error("[DirectoryMap] geocode threw", { id: item.id, err });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

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
            <Tooltip direction="top" offset={[0, -8]} className="location-pin-hover">
              <div className="lph-title">Your Location</div>
            </Tooltip>
          </Marker>
        )}

        {/* Branch markers — click opens parent detail modal directly */}
        {locationsWithCoords.map((item) => (
          <Marker
            key={item.id}
            position={[item.coords.lat, item.coords.lng]}
            icon={icons.gold}
            eventHandlers={{
              click: () => onSelectEntry(item),
            }}
          >
            {/* Permanent gold name label (hidden at low zoom via CSS) */}
            <Tooltip permanent direction="bottom" offset={[0, 4]} className="location-pin-label">
              {item.location || "Unknown Location"}
            </Tooltip>
            {/* Hover tooltip with key details */}
            <Tooltip direction="top" offset={[0, -36]} className="location-pin-hover" sticky>
              <div className="lph-title">{item.location || "Unknown Location"}</div>
              {item.sites && <div className="lph-meta">{item.sites}</div>}
              {item.address && <div className="lph-meta">{item.address}</div>}
              {item.operating_hours && <div className="lph-meta">🕒 {item.operating_hours}</div>}
            </Tooltip>
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
    </div>
  );
}
