import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Filter, Grid, List, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourceCard } from "@/components/resources/ResourceCard";

function FilesPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "newest">("name");
  const [hasVideo, setHasVideo] = useState(false);
  const [hasDownload, setHasDownload] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { files, folders, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  // Get unique folder names from files
  const folderNames = useMemo(() => {
    const names = new Set<string>();
    files.forEach((f) => {
      if (f.folder_name) names.add(f.folder_name);
    });
    return Array.from(names).sort();
  }, [files]);

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.file_name.toLowerCase().includes(term) ||
          f.description?.toLowerCase().includes(term) ||
          f.folder_name?.toLowerCase().includes(term)
      );
    }

    // Folder filter
    if (selectedFolder !== "all") {
      result = result.filter((f) => f.folder_name === selectedFolder);
    }

    // Has video filter
    if (hasVideo) {
      result = result.filter((f) => f.view_video_url);
    }

    // Has download filter
    if (hasDownload) {
      result = result.filter((f) => f.drive_link_download);
    }

    // Sort
    if (sortBy === "name") {
      result.sort((a, b) => a.file_name.localeCompare(b.file_name));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [files, searchTerm, selectedFolder, sortBy, hasVideo, hasDownload]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFolder("all");
    setHasVideo(false);
    setHasDownload(false);
  };

  const hasActiveFilters = searchTerm || selectedFolder !== "all" || hasVideo || hasDownload;

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
            <h1 className="text-2xl font-bold">Files Repository</h1>
            <Badge variant="secondary">{filteredFiles.length} files</Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
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

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "newest")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">A-Z</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch id="hasVideo" checked={hasVideo} onCheckedChange={setHasVideo} />
              <Label htmlFor="hasVideo" className="text-sm">Has Video</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="hasDownload" checked={hasDownload} onCheckedChange={setHasDownload} />
              <Label htmlFor="hasDownload" className="text-sm">Has Download</Label>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            <div className="flex gap-1 ml-auto">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Folder chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge
              variant={selectedFolder === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedFolder("all")}
            >
              All
            </Badge>
            {folderNames.map((name) => (
              <Badge
                key={name}
                variant={selectedFolder === name ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedFolder(name)}
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No files found</p>
            {hasActiveFilters && (
              <Button onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {filteredFiles.map((file) => (
              <ResourceCard
                key={file.id}
                resource={file}
                isFavorite={isFavorite("file", String(file.id))}
                onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                onLogEvent={(eventType) => logEvent("file", String(file.id), eventType)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function FilesPage() {
  return (
    <ResourcesProvider>
      <FilesPageContent />
    </ResourcesProvider>
  );
}
