import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, Link2, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ResourcesProvider, useResources } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourcesHeader } from "@/components/resources/ResourcesHeader";
import { FolderGrid } from "@/components/resources/FolderGrid";
import { HorizontalScroll } from "@/components/resources/HorizontalScroll";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { AmbassadorCard } from "@/components/resources/AmbassadorCard";
import { QuickLinksGrid } from "@/components/resources/QuickLinksGrid";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import type { FileResource } from "@/types/resources";

const statItems = [
  { key: "files", label: "Files", icon: FileText, href: "/resources/files", gradient: "from-blue-500/20 to-cyan-500/20", iconColor: "text-blue-400" },
  { key: "ambassadors", label: "Ambassadors", icon: Users, href: "/resources/ambassadors", gradient: "from-purple-500/20 to-pink-500/20", iconColor: "text-purple-400" },
  { key: "links", label: "Quick Links", icon: Link2, href: "/resources/links", gradient: "from-amber-500/20 to-orange-500/20", iconColor: "text-amber-400" },
  { key: "directory", label: "Directory", icon: MapPin, href: "/resources/directory", gradient: "from-emerald-500/20 to-teal-500/20", iconColor: "text-emerald-400" },
] as const;

function ResourcesHubContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);
  const { isResourceAdmin } = useResources();
  const { files, ambassadors, links, folders, loading, error, toggleFavorite, logEvent, isFavorite } = useResourceData();

  const stats = useMemo(() => ({
    files: files.length,
    ambassadors: ambassadors.length,
    links: links.length,
    directory: "View",
  }), [files, ambassadors, links]);

  const displayedFiles = useMemo(() => {
    if (selectedFolder) return files.filter((f: any) => f.folder_name === selectedFolder);
    return files.slice(0, 8);
  }, [files, selectedFolder]);

  const featuredAmbassadors = useMemo(() => ambassadors.slice(0, 10), [ambassadors]);

  const linkFavorites = useMemo(() => new Set<string>(), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ResourcesHeader searchTerm="" onSearchChange={() => {}} />
        <main className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
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
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ResourcesHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Hero banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-widest text-primary">Your Team Toolkit</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              Resources Hub
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Access files, training materials, ambassador clips, and more — all in one place.
            </p>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statItems.map((item) => {
            const Icon = item.icon;
            const value = stats[item.key];
            return (
              <Link key={item.key} to={item.href}>
                <Card className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <CardContent className="relative p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.gradient} border border-white/5`}>
                      <Icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold leading-none mb-0.5">{value}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>

        {/* Folders */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Browse by Folder</h2>
              <p className="text-xs text-muted-foreground">Tap to filter files by category</p>
            </div>
            {selectedFolder && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedFolder(null)}>
                Clear filter
              </Button>
            )}
          </div>
          <FolderGrid
            folders={folders}
            selectedFolder={selectedFolder}
            onSelectFolder={(name) => setSelectedFolder(prev => prev === name ? null : name)}
          />
        </section>

        {/* Files */}
        {displayedFiles.length > 0 && (
          selectedFolder ? (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold">{selectedFolder}</h2>
                  <p className="text-xs text-muted-foreground">{displayedFiles.length} files</p>
                </div>
                <Link to={`/resources/files?folder=${encodeURIComponent(selectedFolder)}`}>
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                {displayedFiles.map((file) => (
                  <ResourceCard
                    key={file.id}
                    resource={file}
                    compact
                    isFavorite={isFavorite("file", String(file.id))}
                    onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                    onLogEvent={(eventType) => logEvent("file", String(file.id), eventType)}
                    onClick={() => { logEvent("file", String(file.id), "view"); setPreviewFile(file); }}
                  />
                ))}
              </div>
            </section>
          ) : (
            <HorizontalScroll title="Featured Resources" subtitle="Popular files and materials" seeAllHref="/resources/files">
              {displayedFiles.map((file) => (
                <div key={file.id} className="min-w-[140px] w-[140px] flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
                  <ResourceCard
                    resource={file}
                    compact
                    isFavorite={isFavorite("file", String(file.id))}
                    onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                    onLogEvent={(eventType) => logEvent("file", String(file.id), eventType)}
                    onClick={() => { logEvent("file", String(file.id), "view"); setPreviewFile(file); }}
                  />
                </div>
              ))}
            </HorizontalScroll>
          )
        )}

        {/* Ambassadors */}
        {featuredAmbassadors.length > 0 && (
          <HorizontalScroll title="Ambassador Clips" subtitle="Celebrity endorsements" seeAllHref="/resources/ambassadors">
            {featuredAmbassadors.map((ambassador) => (
              <AmbassadorCard
                key={ambassador.id}
                ambassador={ambassador}
                isFavorite={isFavorite("ambassador", ambassador.id)}
                onToggleFavorite={() => toggleFavorite("ambassador", ambassador.id)}
                onLogEvent={(eventType) => logEvent("ambassador", ambassador.id, eventType)}
              />
            ))}
          </HorizontalScroll>
        )}

        {/* Quick Links */}
        {links.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Quick Links</h2>
                <p className="text-xs text-muted-foreground">Essential resources at your fingertips</p>
              </div>
              <Link to="/resources/links">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <QuickLinksGrid
              links={links}
              favorites={linkFavorites}
              onToggleFavorite={(id) => toggleFavorite("link", id)}
              onLogEvent={(id, eventType) => logEvent("link", id, eventType)}
            />
          </section>
        )}
      </main>

      <FilePreviewDialog
        file={previewFile}
        files={displayedFiles}
        open={!!previewFile}
        onOpenChange={(open) => { if (!open) setPreviewFile(null); }}
        isFavorite={previewFile ? isFavorite("file", String(previewFile.id)) : false}
        onToggleFavorite={() => { if (previewFile) toggleFavorite("file", String(previewFile.id)); }}
        onLogEvent={(eventType) => { if (previewFile) logEvent("file", String(previewFile.id), eventType); }}
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
