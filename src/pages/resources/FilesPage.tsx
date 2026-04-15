import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, X, FileText, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import type { FileResource } from "@/types/resources";

function FilesPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "newest">("name");
  const [showFilters, setShowFilters] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);

  const { files, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  const folderNames = useMemo(() => {
    const names = new Set<string>();
    files.forEach((f) => { if (f.folder_name) names.add(f.folder_name); });
    return Array.from(names).sort();
  }, [files]);

  const filteredFiles = useMemo(() => {
    let result = [...files];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.file_name.toLowerCase().includes(term) ||
          f.description?.toLowerCase().includes(term) ||
          f.folder_name?.toLowerCase().includes(term)
      );
    }
    if (selectedFolder !== "all") {
      result = result.filter((f) => f.folder_name === selectedFolder);
    }
    if (sortBy === "name") {
      result.sort((a, b) => a.file_name.localeCompare(b.file_name));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [files, searchTerm, selectedFolder, sortBy]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFolder("all");
  };

  const hasActiveFilters = searchTerm || selectedFolder !== "all";

  const handleFileClick = useCallback((file: FileResource) => {
    logEvent("file", String(file.id), "view");
    setPreviewFile(file);
  }, [logEvent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          {/* Top row */}
          <div className="flex items-center gap-3 mb-3">
            <Link to="/resources">
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <h1 className="text-lg font-bold truncate">Files</h1>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {filteredFiles.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant={showFilters ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex items-center gap-2 mb-3">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "newest")}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">A-Z</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Folder pills - horizontally scrollable */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <Badge
              variant={selectedFolder === "all" ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs whitespace-nowrap flex-shrink-0"
              onClick={() => setSelectedFolder("all")}
            >
              All
            </Badge>
            {folderNames.map((name) => (
              <Badge
                key={name}
                variant={selectedFolder === name ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-xs whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedFolder(name)}
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      {/* Content grid */}
      <main className="container mx-auto px-4 py-4">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base text-muted-foreground mb-3">No files found</p>
            {hasActiveFilters && (
              <Button size="sm" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
            {filteredFiles.map((file) => (
              <ResourceCard
                key={file.id}
                resource={file}
                compact
                isFavorite={isFavorite("file", String(file.id))}
                onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                onLogEvent={(eventType) => logEvent("file", String(file.id), eventType)}
                onClick={() => handleFileClick(file)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Lightbox preview */}
      <FilePreviewDialog
        file={previewFile}
        files={filteredFiles}
        open={!!previewFile}
        onOpenChange={(open) => { if (!open) setPreviewFile(null); }}
        isFavorite={previewFile ? isFavorite("file", String(previewFile.id)) : false}
        onToggleFavorite={() => {
          if (previewFile) toggleFavorite("file", String(previewFile.id));
        }}
        onLogEvent={(eventType) => {
          if (previewFile) logEvent("file", String(previewFile.id), eventType);
        }}
        onNavigate={setPreviewFile}
      />
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
