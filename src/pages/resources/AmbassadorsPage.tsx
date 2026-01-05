import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { AmbassadorCard } from "@/components/resources/AmbassadorCard";

function AmbassadorsPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [hasVideo, setHasVideo] = useState(false);
  const [sortBy, setSortBy] = useState<"endorser" | "product">("endorser");

  const { ambassadors, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  // Get unique folder names
  const folderNames = useMemo(() => {
    const names = new Set<string>();
    ambassadors.forEach((a) => {
      if (a.folder_name) names.add(a.folder_name);
    });
    return Array.from(names).sort();
  }, [ambassadors]);

  // Filtered and sorted
  const filteredAmbassadors = useMemo(() => {
    let result = [...ambassadors];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.endorser?.toLowerCase().includes(term) ||
          a.product_endorsed?.toLowerCase().includes(term) ||
          a.folder_name?.toLowerCase().includes(term)
      );
    }

    // Folder filter
    if (selectedFolder !== "all") {
      result = result.filter((a) => a.folder_name === selectedFolder);
    }

    // Has video filter
    if (hasVideo) {
      result = result.filter((a) => a.video_file_url);
    }

    // Sort
    if (sortBy === "endorser") {
      result.sort((a, b) => (a.endorser || "").localeCompare(b.endorser || ""));
    } else {
      result.sort((a, b) => (a.product_endorsed || "").localeCompare(b.product_endorsed || ""));
    }

    return result;
  }, [ambassadors, searchTerm, selectedFolder, hasVideo, sortBy]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFolder("all");
    setHasVideo(false);
  };

  const hasActiveFilters = searchTerm || selectedFolder !== "all" || hasVideo;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
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
            <h1 className="text-2xl font-bold">Ambassadors Library</h1>
            <Badge variant="secondary">{filteredAmbassadors.length} ambassadors</Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ambassadors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                {folderNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "endorser" | "product")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="endorser">By Endorser</SelectItem>
                <SelectItem value="product">By Product</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch id="hasVideo" checked={hasVideo} onCheckedChange={setHasVideo} />
              <Label htmlFor="hasVideo" className="text-sm">Has Video</Label>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredAmbassadors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No ambassadors found</p>
            {hasActiveFilters && (
              <Button onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAmbassadors.map((ambassador) => (
              <AmbassadorCard
                key={ambassador.id}
                ambassador={ambassador}
                isFavorite={isFavorite("ambassador", ambassador.id)}
                onToggleFavorite={() => toggleFavorite("ambassador", ambassador.id)}
                onLogEvent={(eventType) => logEvent("ambassador", ambassador.id, eventType)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AmbassadorsPage() {
  return (
    <ResourcesProvider>
      <AmbassadorsPageContent />
    </ResourcesProvider>
  );
}
