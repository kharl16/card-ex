import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, X, FileText, SlidersHorizontal, GripVertical, Move } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResourcesProvider, useResources } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import type { FileResource } from "@/types/resources";
import { useSearchQueryParam } from "@/hooks/useSearchQueryParam";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SortableTileProps {
  file: FileResource;
  disabled?: boolean;
  children: React.ReactNode;
}

function SortableTile({ file, disabled, children }: SortableTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: file.id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "z-50 opacity-80 scale-105")}
    >
      {children}
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${file.file_name}`}
          className="absolute top-1 left-1 z-20 p-1.5 rounded-md bg-background/80 backdrop-blur border border-border/60 shadow-sm cursor-grab active:cursor-grabbing touch-none hover:bg-background"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-foreground" />
        </button>
      )}
    </div>
  );
}

function FilesPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "newest" | "custom">("custom");
  const [showFilters, setShowFilters] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);
  const [localOrder, setLocalOrder] = useState<FileResource[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  useSearchQueryParam(setSearchTerm);

  // Read folder from URL query param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const folder = params.get("folder");
    if (folder) {
      setSelectedFolder(folder);
    }
  }, []);

  const { files, loading, toggleFavorite, logEvent, isFavorite, refetch } = useResourceData();
  const { isResourceAdmin } = useResources();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // custom: use sort_order (nulls last), fallback to name
      result.sort((a, b) => {
        const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.file_name.localeCompare(b.file_name);
      });
    }
    return result;
  }, [files, searchTerm, selectedFolder, sortBy]);

  // Local override while reordering, so UI stays snappy before refetch
  const displayFiles = reorderMode && localOrder ? localOrder : filteredFiles;

  // Reset local order whenever the underlying filtered list changes
  useEffect(() => {
    setLocalOrder(null);
  }, [filteredFiles]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFolder("all");
  };

  const hasActiveFilters = searchTerm || selectedFolder !== "all";

  const handleFileClick = useCallback((file: FileResource) => {
    if (reorderMode) return;
    logEvent("file", String(file.id), "view");
    setPreviewFile(file);
  }, [logEvent, reorderMode]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = localOrder ?? filteredFiles;
    const oldIndex = current.findIndex((f) => f.id === active.id);
    const newIndex = current.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(current, oldIndex, newIndex);
    setLocalOrder(reordered);

    // Persist sort_order (admins only)
    if (!isResourceAdmin) {
      toast({
        title: "Reorder saved locally",
        description: "Only resource admins can save the new order for everyone.",
      });
      return;
    }

    setSavingOrder(true);
    try {
      // Assign sort_order in steps of 10 for future insertions
      const updates = reordered.map((file, idx) =>
        supabase
          .from("files_repository")
          .update({ sort_order: (idx + 1) * 10 })
          .eq("id", file.id)
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
      // Auto-switch sort mode to custom so user sees the new order
      setSortBy("custom");
      await refetch();
      toast({ title: "Order saved" });
    } catch (err: unknown) {
      console.error("Failed to save order:", err);
      toast({
        title: "Couldn't save order",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setLocalOrder(null);
    } finally {
      setSavingOrder(false);
    }
  }, [filteredFiles, isResourceAdmin, localOrder, refetch]);

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
                <h1 className="text-lg font-bold truncate">Resources</h1>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {filteredFiles.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant={reorderMode ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setReorderMode((v) => {
                    const next = !v;
                    if (next) setSortBy("custom");
                    setLocalOrder(null);
                    return next;
                  });
                }}
                aria-label={reorderMode ? "Done reordering" : "Reorder files"}
                title={reorderMode ? "Done reordering" : "Drag to reorder"}
                disabled={savingOrder}
              >
                <Move className="h-4 w-4" />
              </Button>
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
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "newest" | "custom")}>
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">A-Z</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
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

      {/* Reorder banner */}
      {reorderMode && (
        <div className="container mx-auto px-4 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Move className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">
                {isResourceAdmin
                  ? "Drag any tile to rearrange. Changes save automatically."
                  : "Drag to preview a new order (only admins can save it for everyone)."}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setReorderMode(false); setLocalOrder(null); }}
              disabled={savingOrder}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Content grid */}
      <main className="container mx-auto px-4 py-4">
        {displayFiles.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base text-muted-foreground mb-3">No files found</p>
            {hasActiveFilters && (
              <Button size="sm" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayFiles.map((f) => f.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                {displayFiles.map((file) => (
                  <SortableTile key={file.id} file={file} disabled={!reorderMode}>
                    <ResourceCard
                      resource={file}
                      compact
                      isFavorite={isFavorite("file", String(file.id))}
                      onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                      onLogEvent={(eventType) => logEvent("file", String(file.id), eventType)}
                      onClick={() => handleFileClick(file)}
                    />
                  </SortableTile>
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
        onImageUpdated={(id, url) => {
          setPreviewFile((p) => (p && p.id === id ? { ...p, images: url } : p));
          refetch();
        }}
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
