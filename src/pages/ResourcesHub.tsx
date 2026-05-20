import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, Link2, BookOpen, Sparkles, Heart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourcesHeader } from "@/components/resources/ResourcesHeader";
import { FolderGrid } from "@/components/resources/FolderGrid";
import { HorizontalScroll } from "@/components/resources/HorizontalScroll";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { AmbassadorCard } from "@/components/resources/AmbassadorCard";
import { QuickLinksGrid } from "@/components/resources/QuickLinksGrid";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import { SectionHeader } from "@/components/resources/SectionHeader";
import type { FileResource } from "@/types/resources";

function ResourcesHubContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);
  const {
    files,
    ambassadors,
    links,
    ways,
    folders,
    loading,
    error,
    toggleFavorite,
    logEvent,
    isFavorite,
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

  const filteredAmbassadors = useMemo(() => {
    if (!term) return ambassadors;
    return ambassadors.filter(
      (a) =>
        a.endorser?.toLowerCase().includes(term) ||
        a.product_endorsed?.toLowerCase().includes(term)
    );
  }, [ambassadors, term]);

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

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <ResourcesHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="container mx-auto px-4 py-6 space-y-10">
        {/* Hero */}
        {!isSearching && (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 p-6 md:p-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                  Your Team Toolkit
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Resources Hub
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                Everything in one place — files, ambassador clips, quick links, and 13 Ways.
                Tap the big search above to find anything instantly.
              </p>
            </div>
          </section>
        )}

        {/* Search results summary */}
        {isSearching && (
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-base">
              Showing results for{" "}
              <span className="font-semibold text-primary">"{searchTerm}"</span> —{" "}
              {filteredFiles.length + filteredAmbassadors.length + filteredLinks.length + filteredWays.length}{" "}
              matches
            </p>
          </div>
        )}

        {/* Featured Row */}
        {featured.length > 0 && !isSearching && (
          <section>
            <SectionHeader
              icon={Sparkles}
              title="Featured & Recent"
              subtitle="Your favorites and what's new"
              viewAllHref="/resources/files"
            />
            <HorizontalScroll>
              {featured.map((file) => (
                <div
                  key={file.id}
                  className="min-w-[160px] w-[160px] flex-shrink-0"
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
          </section>
        )}

        {/* Files / Folders */}
        {folders.length > 0 && (
          <section>
            <SectionHeader
              icon={FileText}
              title="Files"
              subtitle="Browse by folder"
              viewAllHref="/resources/files"
              count={filteredFiles.length}
            />
            <FolderGrid folders={folders} />
          </section>
        )}

        {/* Search-only file matches */}
        {isSearching && filteredFiles.length > 0 && (
          <section>
            <SectionHeader icon={FileText} title="Matching files" count={filteredFiles.length} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
          </section>
        )}

        {/* Ambassadors */}
        {filteredAmbassadors.length > 0 && (
          <section>
            <SectionHeader
              icon={Users}
              title="Ambassador Clips"
              subtitle="Celebrity endorsements"
              viewAllHref="/resources/ambassadors"
              count={filteredAmbassadors.length}
            />
            <HorizontalScroll>
              {filteredAmbassadors.slice(0, 12).map((ambassador) => (
                <AmbassadorCard
                  key={ambassador.id}
                  ambassador={ambassador}
                  isFavorite={isFavorite("ambassador", ambassador.id)}
                  onToggleFavorite={() => toggleFavorite("ambassador", ambassador.id)}
                  onLogEvent={(e) => logEvent("ambassador", ambassador.id, e)}
                />
              ))}
            </HorizontalScroll>
          </section>
        )}

        {/* Quick Links */}
        {filteredLinks.length > 0 && (
          <section>
            <SectionHeader
              icon={Link2}
              title="Quick Links"
              subtitle="Essential resources"
              viewAllHref="/resources/links"
              count={filteredLinks.length}
            />
            <QuickLinksGrid
              links={filteredLinks.slice(0, 8)}
              favorites={new Set()}
              onToggleFavorite={(id) => toggleFavorite("link", id)}
              onLogEvent={(id, e) => logEvent("link", id, e)}
            />
          </section>
        )}

        {/* 13 Ways */}
        {filteredWays.length > 0 && (
          <section>
            <SectionHeader
              icon={BookOpen}
              title="13 Ways"
              subtitle="Wisdom and best practices"
              viewAllHref="/resources/ways"
              count={filteredWays.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWays.slice(0, 3).map((way) => (
                <Link key={way.id} to="/resources/ways">
                  <Card className="hover:border-primary/40 transition-colors h-full">
                    <CardContent className="p-5">
                      <p className="text-base leading-relaxed line-clamp-4">{way.content}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty search state */}
        {isSearching &&
          filteredFiles.length === 0 &&
          filteredAmbassadors.length === 0 &&
          filteredLinks.length === 0 &&
          filteredWays.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-3">
                No matches for "{searchTerm}"
              </p>
              <Button size="lg" onClick={() => setSearchTerm("")}>
                Clear search
              </Button>
            </div>
          )}
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
