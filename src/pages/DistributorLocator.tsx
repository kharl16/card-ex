import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, MapPin, Phone, Clock, Facebook, Navigation,
  Route, Locate, Loader2, List, Map, X, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const DirectoryMapView = lazy(() => import("@/components/tools/sections/DirectoryMapView"));

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

function extractCoordsFromUrl(url: string | null): { lat: number; lng: number } | null {
  if (!url) return null;
  try {
    const patterns = [
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DistributorLocator() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSite, setSelectedSite] = useState("all");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [detailEntry, setDetailEntry] = useState<DirectoryEntry | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("directory_entries")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setEntries((data as DirectoryEntry[]) || []);
      setLoading(false);
    })();
  }, []);

  const siteNames = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => { if (e.sites) s.add(e.sites); });
    const order = ["Branches", "Luzon", "Visayas", "Mindanao", "International"];
    return Array.from(s).sort((a, b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [entries]);

  const filtered = useMemo(() => {
    let r = [...entries];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      r = r.filter(
        (e) =>
          e.location?.toLowerCase().includes(t) ||
          e.address?.toLowerCase().includes(t) ||
          e.owner?.toLowerCase().includes(t) ||
          e.sites?.toLowerCase().includes(t)
      );
    }
    if (selectedSite !== "all") r = r.filter((e) => e.sites === selectedSite);

    // Sort by distance if user location is available
    if (userLocation) {
      r.sort((a, b) => {
        const ca = extractCoordsFromUrl(a.maps_link);
        const cb = extractCoordsFromUrl(b.maps_link);
        if (!ca && !cb) return 0;
        if (!ca) return 1;
        if (!cb) return -1;
        return (
          haversine(userLocation.lat, userLocation.lng, ca.lat, ca.lng) -
          haversine(userLocation.lat, userLocation.lng, cb.lat, cb.lng)
        );
      });
    }
    return r;
  }, [entries, searchTerm, selectedSite, userLocation]);

  const findMe = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { toast.error("Could not get your location"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const getDistance = (entry: DirectoryEntry) => {
    if (!userLocation) return null;
    const c = extractCoordsFromUrl(entry.maps_link);
    if (!c) return null;
    return haversine(userLocation.lat, userLocation.lng, c.lat, c.lng);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Find a Location</h1>
              <p className="text-xs text-muted-foreground">{filtered.length} locations</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={findMe} disabled={locating}
                className="gap-1.5"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
                Near Me
              </Button>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "map" ? "default" : "ghost"} size="sm"
                  onClick={() => setViewMode("map")} className="rounded-none h-8 px-2"
                >
                  <Map className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"} size="sm"
                  onClick={() => setViewMode("list")} className="rounded-none h-8 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations, addresses, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Site chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSite("all")}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                selectedSite === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary/50"
              )}
            >
              All
            </button>
            {siteNames.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSite(s)}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                  selectedSite === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/50"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {viewMode === "map" ? (
          <Suspense fallback={<div className="h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <DirectoryMapView
              items={filtered}
              userLocation={userLocation}
              onSelectEntry={(e) => setDetailEntry(e as DirectoryEntry)}
              extractCoordsFromUrl={extractCoordsFromUrl}
            />
          </Suspense>
        ) : (
          <div className="container mx-auto px-4 py-4">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No locations found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((entry) => {
                  const dist = getDistance(entry);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setDetailEntry(entry)}
                      className="text-left bg-card border border-border/50 rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{entry.location}</h3>
                          {entry.address && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.address}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {entry.sites && <Badge variant="secondary" className="text-[10px]">{entry.sites}</Badge>}
                            {dist != null && (
                              <span className="text-[10px] text-muted-foreground">
                                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!detailEntry} onOpenChange={(o) => !o && setDetailEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detailEntry?.location}</DialogTitle>
          </DialogHeader>
          {detailEntry && <LocationDetail entry={detailEntry} userLocation={userLocation} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationDetail({ entry, userLocation }: { entry: DirectoryEntry; userLocation: { lat: number; lng: number } | null }) {
  const phones = [entry.phone_1, entry.phone_2, entry.phone_3].filter(Boolean) as string[];
  const dist = (() => {
    if (!userLocation) return null;
    const c = extractCoordsFromUrl(entry.maps_link);
    if (!c) return null;
    return haversine(userLocation.lat, userLocation.lng, c.lat, c.lng);
  })();

  const handleDirections = () => {
    if (entry.maps_link) {
      const url = entry.maps_link.includes("?")
        ? `${entry.maps_link}&dir_action=navigate`
        : `${entry.maps_link}?dir_action=navigate`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      {entry.sites && <Badge variant="secondary">{entry.sites}</Badge>}

      {entry.address && (
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <span className="text-sm text-muted-foreground">{entry.address}</span>
        </div>
      )}

      {entry.operating_hours && (
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">{entry.operating_hours}</span>
        </div>
      )}

      {entry.owner && (
        <p className="text-sm"><span className="font-medium">Owner:</span> {entry.owner}</p>
      )}

      {dist != null && (
        <p className="text-sm text-muted-foreground">
          📍 {dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`}
        </p>
      )}

      {phones.length > 0 && (
        <div className="space-y-2">
          {phones.map((p, i) => (
            <Button key={i} variant="default" className="w-full h-12 gap-2 justify-start" onClick={() => window.open(`tel:${p.replace(/[^+\d]/g, "")}`, "_self")}>
              <Phone className="h-4 w-4" /> {p}
            </Button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {entry.maps_link && (
          <Button variant="secondary" className="flex-1 gap-2" onClick={handleDirections}>
            <Route className="h-4 w-4" /> Directions
          </Button>
        )}
        {entry.facebook_page && (
          <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(entry.facebook_page!, "_blank")}>
            <Facebook className="h-4 w-4" /> Facebook
          </Button>
        )}
      </div>
    </div>
  );
}
