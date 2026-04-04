import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Search, MapPin, Phone, Clock, Facebook, Navigation,
  Route, Locate, Loader2, List, Map, X, ArrowLeft, User, Eye, Share2,
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

function formatDistance(dist: number): string {
  return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((entry) => {
                  const dist = getDistance(entry);
                  const phones = [entry.phone_1, entry.phone_2, entry.phone_3].filter(Boolean) as string[];
                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      {/* Owner photo header */}
                      {entry.owner_photo_url ? (
                        <div className="relative h-72 md:h-80 overflow-hidden">
                          <img
                            src={entry.owner_photo_url}
                            alt={entry.owner || "Owner"}
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                          {entry.sites && (
                            <Badge
                              variant="secondary"
                              className="absolute top-2 left-2 z-10 text-xs px-2 py-0.5 bg-primary/90 text-primary-foreground border-0"
                            >
                              {entry.sites}
                            </Badge>
                          )}
                          {dist != null && (
                            <Badge
                              variant="outline"
                              className="absolute top-2 right-2 z-10 text-xs bg-card/80 backdrop-blur-sm border-primary/30 text-primary"
                            >
                              {formatDistance(dist)}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="relative h-40 overflow-hidden bg-muted/80 flex items-center justify-center">
                          <User className="h-12 w-12 text-muted-foreground/30" />
                          {entry.sites && (
                            <Badge
                              variant="secondary"
                              className="absolute top-2 left-2 z-10 text-xs px-2 py-0.5 bg-primary/90 text-primary-foreground border-0"
                            >
                              {entry.sites}
                            </Badge>
                          )}
                          {dist != null && (
                            <Badge
                              variant="outline"
                              className="absolute top-2 right-2 z-10 text-xs bg-card/80 backdrop-blur-sm border-primary/30 text-primary"
                            >
                              {formatDistance(dist)}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-3 sm:p-4 space-y-2">
                        <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight break-words">
                          {entry.location || "Unknown Location"}
                        </h3>

                        {entry.address && (
                          <p className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-2">
                            {entry.address}
                          </p>
                        )}

                        {entry.owner && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            {entry.owner_photo_url ? (
                              <img
                                src={entry.owner_photo_url}
                                alt={entry.owner}
                                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-medium">
                                {entry.owner.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="break-words">{entry.owner}</span>
                          </div>
                        )}

                        {entry.operating_hours && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span className="break-words">{entry.operating_hours}</span>
                          </div>
                        )}

                        {/* Phone numbers — show all */}
                        {phones.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {phones.map((p, i) => (
                              <a
                                key={i}
                                href={`tel:${p.replace(/[^+\d]/g, "")}`}
                                className="flex items-center gap-2 text-xs sm:text-sm text-primary hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{p}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-2">
                          {phones.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 sm:h-11 px-1.5 gap-1 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center"
                              onClick={() => window.open(`tel:${phones[0].replace(/[^+\d]/g, "")}`, "_self")}
                            >
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Call</span>
                            </Button>
                          )}
                          {entry.maps_link && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 sm:h-11 px-1.5 gap-1 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center"
                              onClick={() => window.open(entry.maps_link!, "_blank")}
                            >
                              <Navigation className="w-4 h-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Maps</span>
                            </Button>
                          )}
                          {entry.facebook_page && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 sm:h-11 px-1.5 gap-1 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center"
                              onClick={() => window.open(entry.facebook_page!, "_blank")}
                            >
                              <Facebook className="w-4 h-4 flex-shrink-0" />
                              <span className="hidden sm:inline">FB</span>
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            className="h-10 sm:h-11 px-1.5 gap-1 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setDetailEntry(entry)}
                          >
                            <Eye className="w-4 h-4 flex-shrink-0" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!detailEntry} onOpenChange={(o) => !o && setDetailEntry(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setDetailEntry(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold truncate flex-1">{detailEntry?.location}</h2>
          </div>
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

  return (
    <div className="overflow-y-auto flex-1">
      {/* Owner photo */}
      {entry.owner_photo_url && (
        <div className="relative h-72 md:h-80 overflow-hidden">
          <img src={entry.owner_photo_url} alt={entry.owner || "Owner"} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        </div>
      )}

      <div className="p-4 space-y-4">
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

        {/* All phone numbers as tappable buttons */}
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
            <Button variant="secondary" className="flex-1 gap-2" onClick={() => {
              const url = entry.maps_link!.includes("?") ? `${entry.maps_link}&dir_action=navigate` : `${entry.maps_link}?dir_action=navigate`;
              window.open(url, "_blank");
            }}>
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
    </div>
  );
}
