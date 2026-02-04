import { useState, useEffect, useMemo, ReactNode, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MapPin,
  Phone,
  Facebook,
  Clock,
  Navigation,
  Building2,
  Plus,
  Pencil,
  X,
  SearchX,
  Lightbulb,
  Eye,
  Share2,
  Check,
  UserPlus,
  Route,
  Locate,
  Loader2,
  List,
  Map,
} from "lucide-react";
import { toast } from "sonner";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";

// Lazy load the map component to reduce initial bundle size
const DirectoryMapView = lazy(() => import("./DirectoryMapView"));

// Haversine formula to calculate distance between two lat/lng points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extract coordinates from a Google Maps URL
function extractCoordsFromUrl(url: string | null): { lat: number; lng: number } | null {
  if (!url) return null;

  try {
    // Match patterns like @14.5995,120.9842 or ?ll=14.5995,120.9842 or /place/14.5995,120.9842
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
  } catch {
    // Ignore parsing errors
  }

  return null;
}

// Generate vCard for a directory entry
function generateDirectoryVCard(entry: DirectoryEntry): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  // Organization name (use location as the org)
  if (entry.location) {
    lines.push(`FN:${entry.location}`);
    lines.push(`ORG:${entry.location}`);
  }

  // Address
  if (entry.address) {
    lines.push(`ADR;TYPE=WORK:;;${entry.address};;;;`);
  }

  // Phone numbers
  if (entry.phone_1) lines.push(`TEL;TYPE=WORK,VOICE:${entry.phone_1}`);
  if (entry.phone_2) lines.push(`TEL;TYPE=WORK,VOICE:${entry.phone_2}`);
  if (entry.phone_3) lines.push(`TEL;TYPE=WORK,VOICE:${entry.phone_3}`);

  // Facebook as URL
  if (entry.facebook_page) {
    lines.push(`URL;TYPE=WORK:${entry.facebook_page}`);
  }

  // Build NOTE field with owner and operating hours
  const notesParts: string[] = [];
  if (entry.owner) {
    notesParts.push(`Owner: ${entry.owner}`);
  }
  if (entry.operating_hours) {
    notesParts.push(`Operating Hours: ${entry.operating_hours}`);
  }
  if (notesParts.length > 0) {
    lines.push(`NOTE:${notesParts.join("\\n")}`);
  }

  // Maps link as geo URL
  if (entry.maps_link) {
    lines.push(`X-MAPS:${entry.maps_link}`);
  }

  lines.push(`UID:directory-${entry.id}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

// ScrollArea removed - using native overflow for better mobile compatibility
import { useAuth } from "@/contexts/AuthContext";
import AdminDirectoryDialog from "../admin/AdminDirectoryDialog";

// Utility to highlight matching text
function highlightText(text: string | null, query: string): ReactNode {
  if (!text || !query.trim()) return text || "";

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const startIndex = lowerText.indexOf(lowerQuery);

  if (startIndex === -1) return text;

  const before = text.slice(0, startIndex);
  const match = text.slice(startIndex, startIndex + query.length);
  const after = text.slice(startIndex + query.length);

  return (
    <>
      {before}
      <mark className="bg-primary/30 text-foreground rounded-sm px-0.5">{match}</mark>
      {after}
    </>
  );
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

interface DirectoryEntryWithDistance extends DirectoryEntry {
  distance?: number;
}

interface DirectorySectionProps {
  searchQuery: string;
  onClearSearch?: () => void;
}

export default function DirectorySection({ searchQuery, onClearSearch }: DirectorySectionProps) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  type TabId = "all" | "branches" | "luzon" | "visayas" | "mindanao" | "international";

  /**
   * IMPORTANT FIX:
   * - We render the category tabs HERE as a true 2-column grid (no horizontal overflow).
   * - Order is row-wise so it forms 2 columns / 3 rows:
   *   Row1: All Sites | Branches
   *   Row2: Luzon     | Visayas
   *   Row3: Mindanao  | International
   */
  const TABS: Array<{ id: TabId; label: string; prefix?: string; icon: ReactNode }> = [
    { id: "all", label: "All Sites", icon: <Building2 className="w-4 h-4" /> },
    {
      id: "branches",
      label: "Branches",
      prefix: "Branches",
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: "luzon",
      label: "Luzon",
      prefix: "Luzon",
      icon: <Navigation className="w-4 h-4" />,
    },
    {
      id: "visayas",
      label: "Visayas",
      prefix: "Visayas",
      icon: <Navigation className="w-4 h-4" />,
    },
    {
      id: "mindanao",
      label: "Mindanao",
      prefix: "Mindanao",
      icon: <Navigation className="w-4 h-4" />,
    },
    {
      id: "international",
      label: "International",
      prefix: "International",
      icon: <Route className="w-4 h-4" />,
    },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DirectoryEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // View mode: list or map
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByNearest, setSortByNearest] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleShareBranch = async (entry: DirectoryEntry) => {
    const shareTitle = entry.location || "Branch Details";
    const shareText = [
      `📍 ${entry.location || "Branch"}`,
      entry.address && `Address: ${entry.address}`,
      entry.operating_hours && `Hours: ${entry.operating_hours}`,
      entry.phone_1 && `Phone: ${entry.phone_1}`,
      entry.maps_link && `Maps: ${entry.maps_link}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Try native share first
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to copy
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback to clipboard copy
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Branch info copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy branch info");
    }
  };

  const handleAddToContacts = (entry: DirectoryEntry) => {
    try {
      const vcardContent = generateDirectoryVCard(entry);
      const blob = new Blob([vcardContent], {
        type: "text/vcard;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName =
        entry.location
          ?.trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-_]/g, "") || "branch";
      link.href = url;
      link.download = `${safeName}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Contact file downloaded!");
    } catch (err) {
      console.error("vCard generation failed:", err);
      toast.error("Failed to create contact file");
    }
  };

  const handleGetDirections = (entry: DirectoryEntry) => {
    // Build a navigation URL that works across platforms
    // Priority: use maps_link if available, otherwise construct from address
    let destination = "";

    if (entry.maps_link) {
      const mapsUrl = entry.maps_link;

      if (mapsUrl.includes("google.com/maps") || mapsUrl.includes("goo.gl/maps")) {
        const navUrl = mapsUrl.includes("?") ? `${mapsUrl}&dir_action=navigate` : `${mapsUrl}?dir_action=navigate`;
        window.open(navUrl, "_blank");
        return;
      }

      window.open(mapsUrl, "_blank");
      return;
    }

    if (entry.address) destination = encodeURIComponent(entry.address);
    else if (entry.location) destination = encodeURIComponent(entry.location);

    if (!destination) {
      toast.error("No address available for directions");
      return;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    let directionsUrl: string;

    if (isIOS) {
      directionsUrl = `maps://maps.apple.com/?daddr=${destination}&dirflg=d`;
    } else if (isAndroid) {
      directionsUrl = `google.navigation:q=${destination}`;
    } else {
      directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    }

    window.open(directionsUrl, "_blank");
  };

  // Handle geolocation request
  const handleSortByNearest = useCallback(() => {
    if (sortByNearest) {
      setSortByNearest(false);
      setUserLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSortByNearest(true);
        setGeoLoading(false);
        toast.success("Sorting by nearest location");
      },
      (error) => {
        setGeoLoading(false);
        let message = "Unable to get your location";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out";
        }
        setGeoError(message);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      },
    );
  }, [sortByNearest]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("directory_entries")
        .select("*")
        .eq("is_active", true)
        .order("location", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching directory:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = {
      all: items.length,
      branches: 0,
      luzon: 0,
      visayas: 0,
      mindanao: 0,
      international: 0,
    };

    items.forEach((item) => {
      const s = item.sites?.trim();
      if (!s) return;
      if (s === "Branches") counts.branches += 1;
      else if (s === "Luzon") counts.luzon += 1;
      else if (s === "Visayas") counts.visayas += 1;
      else if (s === "Mindanao") counts.mindanao += 1;
      else if (s === "International") counts.international += 1;
    });

    return counts;
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sites?.toLowerCase().includes(searchQuery.toLowerCase());

      const tab = TABS.find((t) => t.id === activeTab);
      const matchesSite = tab?.id === "all" || (!!tab?.prefix && (item.sites || "").trim().startsWith(tab.prefix));

      return matchesSearch && matchesSite;
    });

    if (sortByNearest && userLocation) {
      const itemsWithDistance: DirectoryEntryWithDistance[] = result.map((item) => {
        const coords = extractCoordsFromUrl(item.maps_link);
        let distance: number | undefined;

        if (coords) {
          distance = calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
        }

        return { ...item, distance };
      });

      itemsWithDistance.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return 0;
      });

      return itemsWithDistance;
    }

    return result;
  }, [items, searchQuery, activeTab, sortByNearest, userLocation]);

  if (loading) {
    return <ToolsSkeleton type="list" count={4} />;
  }

  const handleEdit = (item: DirectoryEntry) => {
    setEditingItem(item);
    setAdminDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setAdminDialogOpen(true);
  };

  if (items.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No branches available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Admin Add Button */}
      {isAdmin && (
        <Button onClick={handleAdd} className="w-full max-w-full gap-2 overflow-hidden">
          <Plus className="w-4 h-4" />
          <span className="truncate">Add Directory Entry</span>
        </Button>
      )}

      {/* Clear Search Button */}
      {searchQuery.trim() && onClearSearch && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-muted-foreground hover:text-foreground"
          onClick={onClearSearch}
        >
          <X className="w-4 h-4" />
          Clear search: "{searchQuery}"
        </Button>
      )}

      {/* ✅ FIXED: Category tabs rendered as a real 2-column grid (always visible, no kick-out) */}
      <div className="w-full max-w-full">
        <div className="grid grid-cols-2 gap-2 w-full max-w-full">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full min-w-0",
                  "flex items-center justify-between gap-2",
                  "rounded-xl border px-3 py-2.5",
                  "transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary/40 shadow-sm"
                    : "bg-card text-foreground border-border/60 hover:border-primary/30 hover:bg-muted/30",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={cn("shrink-0", isActive ? "text-primary-foreground" : "text-primary")}>
                    {tab.icon}
                  </span>
                  <span className="font-semibold text-sm truncate">{tab.label}</span>
                </span>

                <span
                  className={cn(
                    "shrink-0 text-xs rounded-full px-2 py-0.5 border",
                    isActive
                      ? "bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20"
                      : "bg-muted/30 text-muted-foreground border-border/50",
                  )}
                >
                  {tabCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Mode Toggle + Sort by Nearest */}
      <div className="flex gap-2">
        {/* List/Map Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className={cn("h-11 px-4 gap-2 rounded-none", viewMode === "list" && "bg-primary text-primary-foreground")}
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-11 px-4 gap-2 rounded-none border-l border-border",
              viewMode === "map" && "bg-primary text-primary-foreground",
            )}
            onClick={() => setViewMode("map")}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Map</span>
          </Button>
        </div>

        {/* Sort by Nearest Button */}
        <Button
          variant={sortByNearest ? "default" : "outline"}
          size="sm"
          className={cn("flex-1 gap-2 h-11", sortByNearest && "bg-primary text-primary-foreground")}
          onClick={handleSortByNearest}
          disabled={geoLoading}
        >
          {geoLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Getting location...</span>
            </>
          ) : sortByNearest ? (
            <>
              <Locate className="w-4 h-4" />
              <span className="truncate">Nearest • Reset</span>
            </>
          ) : (
            <>
              <Locate className="w-4 h-4" />
              <span className="truncate">Sort by nearest</span>
            </>
          )}
        </Button>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <Suspense
          fallback={
            <div className="w-full h-[60vh] min-h-[400px] rounded-xl border border-border bg-muted/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          }
        >
          <DirectoryMapView
            items={filteredItems}
            userLocation={userLocation}
            onSelectEntry={setSelectedEntry}
            extractCoordsFromUrl={extractCoordsFromUrl}
          />
        </Suspense>
      )}

      {/* Directory Cards (List View) */}
      {viewMode === "list" && (
        <div className="grid gap-4 w-full">
          {filteredItems.map((item) => {
            const itemWithDistance = item as DirectoryEntryWithDistance;
            const hasDistance = sortByNearest && itemWithDistance.distance !== undefined;

            return (
              <div
                key={item.id}
                className={cn(
                  "p-3 sm:p-4 rounded-2xl relative w-full",
                  "bg-card border border-border/50 shadow-sm",
                  "hover:shadow-md hover:border-primary/30 transition-all",
                )}
              >
                {/* Admin Edit Button */}
                {isAdmin && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}

                <div className="flex gap-3 sm:gap-4">
                  {/* Location Image or Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0 overflow-hidden",
                      !item.location_image_url && "flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20",
                    )}
                  >
                    {item.location_image_url ? (
                      <img
                        src={item.location_image_url}
                        alt={item.location || "Location"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-start gap-2 pr-8">
                      <h4 className="font-semibold text-foreground text-base sm:text-lg leading-tight break-words">
                        {highlightText(item.location, searchQuery) || "Unknown Location"}
                      </h4>
                      {hasDistance && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs bg-primary/10 text-primary border-primary/30"
                        >
                          {itemWithDistance.distance! < 1
                            ? `${Math.round(itemWithDistance.distance! * 1000)}m`
                            : `${itemWithDistance.distance!.toFixed(1)}km`}
                        </Badge>
                      )}
                    </div>

                    {item.address && (
                      <p className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-2">
                        {highlightText(item.address, searchQuery)}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.sites && (
                        <Badge variant="secondary" className="text-xs">
                          {item.sites}
                        </Badge>
                      )}
                      {sortByNearest && itemWithDistance.distance === undefined && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No coordinates
                        </Badge>
                      )}
                    </div>

                    {/* Owner with photo */}
                    {item.owner && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        {item.owner_photo_url ? (
                          <img
                            src={item.owner_photo_url}
                            alt={item.owner}
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-medium">
                            {item.owner.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="break-words">{item.owner}</span>
                      </div>
                    )}

                    {item.operating_hours && (
                      <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{item.operating_hours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions - Grid layout for consistent button sizing */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                  {item.phone_1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 sm:h-11 px-1.5 xxs:px-2 sm:px-3 gap-1 sm:gap-2 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center"
                      onClick={() => window.open(`tel:${item.phone_1}`, "_self")}
                    >
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden xxs:inline">Call</span>
                    </Button>
                  )}

                  {item.maps_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 sm:h-11 px-1.5 xxs:px-2 sm:px-3 gap-1 sm:gap-2 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center"
                      onClick={() => window.open(item.maps_link!, "_blank")}
                    >
                      <Navigation className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden xxs:inline">Maps</span>
                    </Button>
                  )}

                  {item.facebook_page && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 sm:h-11 px-1.5 xxs:px-2 sm:px-3 gap-1 sm:gap-2 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center"
                      onClick={() => window.open(item.facebook_page!, "_blank")}
                    >
                      <Facebook className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden xxs:inline">FB</span>
                    </Button>
                  )}

                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 sm:h-11 px-1.5 xxs:px-2 sm:px-3 gap-1 sm:gap-2 rounded-lg sm:rounded-xl text-xs sm:text-sm justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setSelectedEntry(item)}
                  >
                    <Eye className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xxs:inline">View</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredItems.length === 0 && viewMode === "list" && (
        <div className="text-center py-12 px-4 animate-fade-in">
          {/* Illustration */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <SearchX className="w-12 h-12 text-muted-foreground/60" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <MapPin className="w-4 h-4 text-primary/60" />
            </div>
          </div>

          {/* Message */}
          <h3 className="text-lg font-semibold text-foreground mb-2">No branches found</h3>
          {searchQuery.trim() && (
            <p className="text-sm text-muted-foreground mb-4">
              No results for "<span className="font-medium text-foreground">{searchQuery}</span>"
            </p>
          )}

          {/* Suggestions */}
          <div className="bg-muted/50 rounded-xl p-4 max-w-xs mx-auto mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="font-medium">Try these suggestions:</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 text-left">
              <li>• Check your spelling</li>
              <li>• Try a shorter search term</li>
              <li>• Search by city or area name</li>
              {activeTab !== "all" && <li>• Clear the site filter</li>}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            {searchQuery.trim() && onClearSearch && (
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={onClearSearch}>
                <X className="w-4 h-4" />
                Clear search
              </Button>
            )}
            {activeTab !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => setActiveTab("all")}
              >
                <Building2 className="w-4 h-4" />
                Show all sites
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEntry?.location || "Branch Details"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Location Image - Full view without cropping */}
            {selectedEntry?.location_image_url && (
              <div className="w-full rounded-xl overflow-hidden bg-muted p-2">
                <img
                  src={selectedEntry.location_image_url}
                  alt={selectedEntry.location || "Location"}
                  className="w-full h-auto max-h-64 object-contain mx-auto rounded-lg"
                />
                <p className="text-xs text-muted-foreground text-center mt-2">Location Image</p>
              </div>
            )}

            {selectedEntry?.sites && (
              <Badge variant="secondary" className="text-sm">
                {selectedEntry.sites}
              </Badge>
            )}

            {selectedEntry?.address && (
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="text-foreground">{selectedEntry.address}</p>
              </div>
            )}

            {selectedEntry?.owner && (
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Owner</p>
                {selectedEntry.owner_photo_url && (
                  <div className="w-full rounded-lg overflow-hidden bg-background">
                    <img
                      src={selectedEntry.owner_photo_url}
                      alt={selectedEntry.owner}
                      className="w-full h-auto max-h-48 object-contain mx-auto"
                    />
                  </div>
                )}
                <p className="text-foreground font-medium text-center">{selectedEntry.owner}</p>
              </div>
            )}

            {selectedEntry?.operating_hours && (
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Operating Hours</p>
                <p className="text-foreground">{selectedEntry.operating_hours}</p>
              </div>
            )}

            {/* Phone Numbers */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Contact Numbers</p>
              <div className="flex flex-wrap gap-2">
                {selectedEntry?.phone_1 && (
                  <Button
                    variant="outline"
                    className="h-12 gap-2"
                    onClick={() => window.open(`tel:${selectedEntry.phone_1}`, "_self")}
                  >
                    <Phone className="w-5 h-5" />
                    {selectedEntry.phone_1}
                  </Button>
                )}
                {selectedEntry?.phone_2 && (
                  <Button
                    variant="outline"
                    className="h-12 gap-2"
                    onClick={() => window.open(`tel:${selectedEntry.phone_2}`, "_self")}
                  >
                    <Phone className="w-5 h-5" />
                    {selectedEntry.phone_2}
                  </Button>
                )}
                {selectedEntry?.phone_3 && (
                  <Button
                    variant="outline"
                    className="h-12 gap-2"
                    onClick={() => window.open(`tel:${selectedEntry.phone_3}`, "_self")}
                  >
                    <Phone className="w-5 h-5" />
                    {selectedEntry.phone_3}
                  </Button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {/* Directions Button - Primary Action */}
              {selectedEntry && (selectedEntry.maps_link || selectedEntry.address) && (
                <Button
                  className="w-full h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handleGetDirections(selectedEntry)}
                >
                  <Route className="w-5 h-5" />
                  Get Directions
                </Button>
              )}

              <div className="flex gap-3">
                {selectedEntry?.maps_link && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 gap-2"
                    onClick={() => window.open(selectedEntry.maps_link!, "_blank")}
                  >
                    <Navigation className="w-5 h-5" />
                    View on Maps
                  </Button>
                )}
                {selectedEntry?.facebook_page && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 gap-2"
                    onClick={() => window.open(selectedEntry.facebook_page!, "_blank")}
                  >
                    <Facebook className="w-5 h-5" />
                    Facebook
                  </Button>
                )}
              </div>

              {/* Share & Add to Contacts */}
              {selectedEntry && (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1 h-12 gap-2"
                    onClick={() => handleShareBranch(selectedEntry)}
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-primary" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        Share
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 gap-2"
                    onClick={() => handleAddToContacts(selectedEntry)}
                  >
                    <UserPlus className="w-5 h-5" />
                    Add to Contacts
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Dialog */}
      <AdminDirectoryDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        item={editingItem}
        onSaved={fetchItems}
      />
    </div>
  );
}
