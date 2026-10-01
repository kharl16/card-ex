import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Link2, BookOpen, Sparkles, Heart, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourcesHeader } from "@/components/resources/ResourcesHeader";
import { FolderGrid } from "@/components/resources/FolderGrid";
import { HorizontalScroll } from "@/components/resources/HorizontalScroll";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { QuickLinksGrid } from "@/components/resources/QuickLinksGrid";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import { ImmersivePavilion } from "@/components/resources/ImmersivePavilion";
import { ImmersiveShelf } from "@/components/resources/ImmersiveShelf";
import type { FileResource } from "@/types/resources";
import AdminLinkDialog from "@/components/tools/admin/AdminLinkDialog";
import { useAuth } from "@/contexts/AuthContext";

function ResourcesHubContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const { isSuperAdmin } = useAuth();
  const {
    files,
    links,
    ways,
    folders,
    loading,
    error,
    toggleFavorite,
    logEvent,
    isFavorite,
    refetch,
  } = useResourceData();

  const term = searchTerm.trim().toLowerCase();

  const filteredFiles = useMemo(() => {
    if (!term) return files;
    return files.filter(
      (f) =>
        f.file_name?.toLowerCase().includes(term) ||
        f.description?.toLowerCase().includes(term) ||
        f.folder_name?.toLowerCase().includes(term)
    );
  }, [files, term]);


  const filteredLinks = useMemo(() => {
    if (!term) return links;
    return links.filter((l) => l.name?.toLowerCase().includes(term));
  }, [links, term]);

  const filteredWays = useMemo(() => {
    if (!term) return ways;
    return ways.filter((w) => w.content?.toLowerCase().includes(term));
  }, [ways, term]);

  // Featured = favorites first, then most recent
  const featured = useMemo(() => {
    const favs = filteredFiles.filter((f) => isFavorite("file", String(f.id)));
    const rest = filteredFiles.filter((f) => !isFavorite("file", String(f.id)));
    const sortedRest = [...rest].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return [...favs, ...sortedRest].slice(0, 12);
  }, [filteredFiles, isFavorite]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ResourcesHeader searchTerm="" onSearchChange={() => {}} />
        <main className="container mx-auto px-4 py-6 space-y-8">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <ResourcesHeader searchTerm="" onSearchChange={() => {}} />
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardContent className="p-8 text-center">
              <p className="text-destructive mb-4 text-base">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isSearching = term.length > 0;

  const shortcuts = [
    { key: "featured", label: "Featured", icon: Sparkles, show: featured.length > 0 && !isSearching },
    { key: "folders", label: "Folders", icon: FileText, show: folders.length > 0 },
    { key: "links", label: "Links", icon: Link2, show: filteredLinks.length > 0 || isSuperAdmin },
    { key: "ways", label: "13 Ways", icon: BookOpen, show: filteredWays.length > 0 },
  ].filter((s) => s.show);

  const jumpTo = (key: string) => {
    document
      .getElementById(`resources-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <ResourcesHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        <ImmersivePavilion>
          {/* Curator category chips */}
          {shortcuts.length > 1 && (
            <nav
              aria-label="Resource sections"
              className="mb-2 max-w-full overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex w-max min-w-full items-center justify-between gap-2">
                {shortcuts.map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    onClick={() => jumpTo(key)}
                    className="h-11 flex-1 gap-2 rounded-full border-primary/40 bg-card/70 px-3 text-foreground shadow-sm backdrop-blur-md hover:border-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Button>
                ))}
              </div>
            </nav>
          )}

          {/* Search results summary */}
          {isSearching && (
            <div className="mx-3 mb-3 rounded-2xl border border-primary/25 bg-card/60 p-4 backdrop-blur-md sm:mx-5">
              <p className="text-base text-foreground">
                Showing results for{" "}
                <span className="font-semibold text-primary">"{searchTerm}"</span> —{" "}
                {filteredFiles.length + filteredLinks.length + filteredWays.length} matches
              </p>
            </div>
          )}

          {/* Featured Row */}
          {featured.length > 0 && !isSearching && (
            <ImmersiveShelf
              id="resources-featured"
              icon={Sparkles}
              title="Featured & Recent"
              subtitle="Your favorites and what's new"
              viewAllHref="/resources/files"
            >
              <HorizontalScroll>
                {featured.map((file) => (
                  <div
                    key={file.id}
                    className="w-[160px] min-w-[160px] flex-shrink-0 [filter:drop-shadow(0_10px_14px_rgba(0,0,0,0.75))_drop-shadow(0_2px_3px_rgba(0,0,0,0.5))]"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <ResourceCard
                      resource={file}
                      compact
                      isFavorite={isFavorite("file", String(file.id))}
                      onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                      onLogEvent={(e) => logEvent("file", String(file.id), e)}
                      onClick={() => {
                        logEvent("file", String(file.id), "view");
                        setPreviewFile(file);
                      }}
                    />
                  </div>
                ))}
              </HorizontalScroll>
            </ImmersiveShelf>
          )}

          {/* Files / Folders */}
          {folders.length > 0 && (
            <ImmersiveShelf
              id="resources-folders"
              icon={FileText}
              title="Files"
              subtitle="Browse by folder"
              viewAllHref="/resources/files"
              count={filteredFiles.length}
            >
              <FolderGrid folders={folders} />
            </ImmersiveShelf>
          )}

          {/* Search-only file matches */}
          {isSearching && filteredFiles.length > 0 && (
            <ImmersiveShelf
              icon={FileText}
              title="Matching files"
              count={filteredFiles.length}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {filteredFiles.slice(0, 24).map((file) => (
                  <ResourceCard
                    key={file.id}
                    resource={file}
                    compact
                    isFavorite={isFavorite("file", String(file.id))}
                    onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                    onLogEvent={(e) => logEvent("file", String(file.id), e)}
                    onClick={() => {
                      logEvent("file", String(file.id), "view");
                      setPreviewFile(file);
                    }}
                  />
                ))}
              </div>
            </ImmersiveShelf>
          )}

          {/* Quick Links */}
          {(filteredLinks.length > 0 || isSuperAdmin) && (
            <ImmersiveShelf
              id="resources-links"
              icon={Link2}
              title="Quick Links"
              subtitle="Essential resources"
              viewAllHref="/resources/links"
              count={filteredLinks.length}
            >
              {isSuperAdmin && (
                <div className="mb-4">
                  <Button size="sm" className="gap-2" onClick={() => setLinkDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Quick Link
                  </Button>
                </div>
              )}
              <QuickLinksGrid
                links={filteredLinks.slice(0, 8)}
                favorites={new Set()}
                onToggleFavorite={(id) => toggleFavorite("link", id)}
                onLogEvent={(id, e) => logEvent("link", id, e)}
              />
            </ImmersiveShelf>
          )}

          {/* 13 Ways */}
          {filteredWays.length > 0 && (
            <ImmersiveShelf
              id="resources-ways"
              icon={BookOpen}
              title="13 Ways"
              subtitle="Wisdom and best practices"
              viewAllHref="/resources/ways"
              count={filteredWays.length}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredWays.slice(0, 3).map((way, i) => (
                  <Link key={way.id} to="/resources/ways" className="group block h-full">
                    <div className="relative h-full overflow-hidden rounded-2xl border border-primary/20 bg-background/80 p-5 shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.5)] backdrop-blur-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/50">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                      <div className="pointer-events-none absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,hsl(var(--foreground)/0.03)_0px,hsl(var(--foreground)/0.03)_1px,transparent_1px,transparent_18px)]" />
                      <div className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-primary/15 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <span className="relative font-mono text-2xl font-bold text-primary/80">{String(i + 1).padStart(2, "0")}</span>
                      <p className="relative mt-2 line-clamp-4 text-base leading-relaxed text-foreground">{way.content}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </ImmersiveShelf>
          )}

          {/* Empty search state */}
          {isSearching &&
            filteredFiles.length === 0 &&
            filteredLinks.length === 0 &&
            filteredWays.length === 0 && (
              <div className="px-4 py-16 text-center">
                <p className="mb-3 text-lg text-muted-foreground">
                  No matches for "{searchTerm}"
                </p>
                <Button size="lg" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              </div>
            )}
        </ImmersivePavilion>
      </main>

      {/* Mobile bottom nav — senior-friendly */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t safe-area-inset-bottom">
        <div className="grid grid-cols-3 gap-1 p-2">
          <Link to="/resources" className="flex flex-col items-center justify-center min-h-[56px] rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-[11px] font-medium mt-1">Home</span>
          </Link>
          <Link to="/resources/favorites" className="flex flex-col items-center justify-center min-h-[56px] rounded-xl hover:bg-muted">
            <Heart className="h-5 w-5" />
            <span className="text-[11px] font-medium mt-1">Favorites</span>
          </Link>
          <Link to="/resources/recent" className="flex flex-col items-center justify-center min-h-[56px] rounded-xl hover:bg-muted">
            <Clock className="h-5 w-5" />
            <span className="text-[11px] font-medium mt-1">Recent</span>
          </Link>
        </div>
      </nav>

      <FilePreviewDialog
        file={previewFile}
        files={filteredFiles}
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        isFavorite={previewFile ? isFavorite("file", String(previewFile.id)) : false}
        onToggleFavorite={() => {
          if (previewFile) toggleFavorite("file", String(previewFile.id));
        }}
        onLogEvent={(e) => {
          if (previewFile) logEvent("file", String(previewFile.id), e);
        }}
        onNavigate={setPreviewFile}
      />

      {isSuperAdmin && (
        <AdminLinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          item={null}
          onSaved={() => refetch()}
        />
      )}

    </div>
  );
}

export default function ResourcesHub() {
  return (
    <ResourcesProvider>
      <ResourcesHubContent />
    </ResourcesProvider>
  );
}
