import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { DirectoryCard } from "@/components/resources/DirectoryCard";
import { cn } from "@/lib/utils";

function DirectoryPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"location" | "owner">("location");

  const { directory, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  // Define preferred order for sites
  const siteOrder = ["Branches", "Luzon IBCs", "Visayas IBCs", "Mindanao IBCs", "International IBCs"];

  // Get unique sites with custom ordering
  const siteNames = useMemo(() => {
    const names = new Set<string>();
    directory.forEach((d) => {
      if (d.sites) names.add(d.sites);
    });
    const allSites = Array.from(names);
    // Sort by preferred order, then alphabetically for any not in the list
    return allSites.sort((a, b) => {
      const aIndex = siteOrder.indexOf(a);
      const bIndex = siteOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [directory]);

  // Filtered and sorted
  const filteredDirectory = useMemo(() => {
    let result = [...directory];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.location?.toLowerCase().includes(term) ||
          d.address?.toLowerCase().includes(term) ||
          d.owner?.toLowerCase().includes(term) ||
          d.sites?.toLowerCase().includes(term)
      );
    }

    // Site filter
    if (selectedSite !== "all") {
      result = result.filter((d) => d.sites === selectedSite);
    }

    // Sort
    if (sortBy === "location") {
      result.sort((a, b) => (a.location || "").localeCompare(b.location || ""));
    } else {
      result.sort((a, b) => (a.owner || "").localeCompare(b.owner || ""));
    }

    return result;
  }, [directory, searchTerm, selectedSite, sortBy]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSite("all");
  };

  const hasActiveFilters = searchTerm || selectedSite !== "all";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/resources">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Directory</h1>
            <Badge variant="secondary">{filteredDirectory.length} locations</Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {siteNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "location" | "owner")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">By Location</SelectItem>
                <SelectItem value="owner">By Owner</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Site chips - wrapping layout */}
          <div className="w-full max-w-full overflow-visible">
            <div className="flex flex-wrap items-center gap-2 w-full max-w-full">
              <button
                type="button"
                onClick={() => setSelectedSite("all")}
                className={cn(
                  "inline-flex items-center gap-2 h-11 px-4 rounded-full max-w-full min-w-0 whitespace-nowrap text-sm font-semibold transition-colors border",
                  selectedSite === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/50"
                )}
              >
                All Sites
              </button>
              {siteNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedSite(name)}
                  className={cn(
                    "inline-flex items-center gap-2 h-11 px-4 rounded-full max-w-full min-w-0 whitespace-nowrap text-sm font-semibold transition-colors border",
                    selectedSite === name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredDirectory.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No locations found</p>
            {hasActiveFilters && (
              <Button onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDirectory.map((entry) => (
              <DirectoryCard
                key={entry.id}
                entry={entry}
                isFavorite={isFavorite("directory", String(entry.id))}
                onToggleFavorite={() => toggleFavorite("directory", String(entry.id))}
                onLogEvent={(eventType) => logEvent("directory", String(entry.id), eventType)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <ResourcesProvider>
      <DirectoryPageContent />
    </ResourcesProvider>
  );
}
