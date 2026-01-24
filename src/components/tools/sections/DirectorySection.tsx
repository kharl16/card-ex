import { useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Phone, Facebook, Clock, Navigation, Building2, Plus, Pencil, X, SearchX, Lightbulb, Eye, Share2, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";

// Generate vCard for a directory entry
function generateDirectoryVCard(entry: DirectoryEntry): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
  ];

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
  if (entry.phone_1) {
    lines.push(`TEL;TYPE=WORK,VOICE:${entry.phone_1}`);
  }
  if (entry.phone_2) {
    lines.push(`TEL;TYPE=WORK,VOICE:${entry.phone_2}`);
  }
  if (entry.phone_3) {
    lines.push(`TEL;TYPE=WORK,VOICE:${entry.phone_3}`);
  }

  // Facebook as URL
  if (entry.facebook_page) {
    lines.push(`URL;TYPE=WORK:${entry.facebook_page}`);
  }

  // Operating hours as note
  if (entry.operating_hours) {
    lines.push(`NOTE:Operating Hours: ${entry.operating_hours}`);
  }

  // Owner
  if (entry.owner) {
    lines.push(`X-OWNER:${entry.owner}`);
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
}

interface DirectorySectionProps {
  searchQuery: string;
  onClearSearch?: () => void;
}

export default function DirectorySection({ searchQuery, onClearSearch }: DirectorySectionProps) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<string[]>([]);
  const [activeSite, setActiveSite] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DirectoryEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShareBranch = async (entry: DirectoryEntry) => {
    const shareTitle = entry.location || "Branch Details";
    const shareText = [
      `📍 ${entry.location || "Branch"}`,
      entry.address && `Address: ${entry.address}`,
      entry.operating_hours && `Hours: ${entry.operating_hours}`,
      entry.phone_1 && `Phone: ${entry.phone_1}`,
      entry.maps_link && `Maps: ${entry.maps_link}`,
    ].filter(Boolean).join("\n");

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
      const safeName = entry.location?.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "branch";
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

      // Extract unique sites
      const uniqueSites = [...new Set((data || []).map((item) => item.sites).filter(Boolean))] as string[];
      setSites(uniqueSites);
    } catch (err) {
      console.error("Error fetching directory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate branch counts per site
  const siteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (item.sites) {
        counts[item.sites] = (counts[item.sites] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sites?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSite = !activeSite || item.sites === activeSite;

    return matchesSearch && matchesSite;
  });

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
        <Button onClick={handleAdd} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Directory Entry
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

      {/* Site Filter - horizontal scroll for badges */}
      {sites.length > 0 && (
        <div className="w-full overflow-x-auto overflow-y-hidden -mx-1 px-1">
          <div className="flex gap-2 pb-2 min-w-min">
            <Badge
              variant={activeSite === null ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-2 text-xs gap-1.5 flex-shrink-0",
                activeSite === null && "bg-primary text-primary-foreground"
              )}
              onClick={() => setActiveSite(null)}
            >
              <Building2 className="w-3.5 h-3.5" />
              All Sites
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center",
                activeSite === null 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {items.length}
              </span>
            </Badge>
            {sites.map((site) => (
              <Badge
                key={site}
                variant={activeSite === site ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-2 text-xs whitespace-nowrap flex-shrink-0",
                  activeSite === site && "bg-primary text-primary-foreground"
                )}
                onClick={() => setActiveSite(site)}
              >
                {site}
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center",
                  activeSite === site 
                    ? "bg-primary-foreground/20 text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {siteCounts[site] || 0}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Directory Cards */}
      <div className="grid gap-4 w-full">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "p-3 sm:p-4 rounded-2xl relative w-full",
              "bg-card border border-border/50 shadow-sm",
              "hover:shadow-md hover:border-primary/30 transition-all"
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
              {/* Icon */}
              <div
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0 flex items-center justify-center",
                  "bg-gradient-to-br from-primary/20 to-primary/5",
                  "border border-primary/20"
                )}
              >
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-semibold text-foreground text-base sm:text-lg leading-tight truncate pr-8">
                  {highlightText(item.location, searchQuery) || "Unknown Location"}
                </h4>
                {item.address && (
                  <p className="text-xs text-muted-foreground truncate">
                    {highlightText(item.address, searchQuery)}
                  </p>
                )}
                {item.sites && (
                  <Badge variant="secondary" className="text-xs">
                    {item.sites}
                  </Badge>
                )}
                {item.operating_hours && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.operating_hours}</span>
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
        ))}
      </div>

      {filteredItems.length === 0 && (
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
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No branches found
          </h3>
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
              {activeSite && <li>• Clear the site filter</li>}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            {searchQuery.trim() && onClearSearch && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={onClearSearch}
              >
                <X className="w-4 h-4" />
                Clear search
              </Button>
            )}
            {activeSite && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => setActiveSite(null)}
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
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Owner</p>
                <p className="text-foreground">{selectedEntry.owner}</p>
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
              <div className="flex gap-3">
                {selectedEntry?.maps_link && (
                  <Button
                    className="flex-1 h-12 gap-2"
                    onClick={() => window.open(selectedEntry.maps_link!, "_blank")}
                  >
                    <Navigation className="w-5 h-5" />
                    Open in Maps
                  </Button>
                )}
                {selectedEntry?.facebook_page && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 gap-2"
                    onClick={() => window.open(selectedEntry.facebook_page!, "_blank")}
                  >
                    <Facebook className="w-5 h-5" />
                    Facebook Page
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
