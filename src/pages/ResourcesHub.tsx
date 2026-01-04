import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, Link2, BookOpen, MapPin, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourcesProvider, useResources } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourcesHeader } from "@/components/resources/ResourcesHeader";
import { FolderGrid } from "@/components/resources/FolderGrid";
import { HorizontalScroll } from "@/components/resources/HorizontalScroll";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { AmbassadorCard } from "@/components/resources/AmbassadorCard";
import { QuickLinksGrid } from "@/components/resources/QuickLinksGrid";

function ResourcesHubContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const { isResourceAdmin } = useResources();
  const { files, ambassadors, links, folders, loading, error, toggleFavorite, logEvent, isFavorite } = useResourceData();

  // Stats
  const stats = useMemo(() => ({
    files: files.length,
    ambassadors: ambassadors.length,
    links: links.length,
    folders: folders.length,
  }), [files, ambassadors, links, folders]);

  // Featured items (most recent or first 8)
  const featuredFiles = useMemo(() => files.slice(0, 8), [files]);
  const featuredAmbassadors = useMemo(() => ambassadors.slice(0, 10), [ambassadors]);

  // Favorites set for links
  const linkFavorites = useMemo(() => {
    const set = new Set<string>();
    // This would come from useResourceData
    return set;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ResourcesHeader searchTerm="" onSearchChange={() => {}} />
        <main className="container mx-auto px-4 py-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
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

      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <section className="text-center py-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Resources Hub
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Centralized tools and resources for our team. Access files, training materials, and more.
          </p>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/resources/files">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.files}</p>
                  <p className="text-sm text-muted-foreground">Files</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/resources/ambassadors">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.ambassadors}</p>
                  <p className="text-sm text-muted-foreground">Ambassadors</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/resources/links">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Link2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.links}</p>
                  <p className="text-sm text-muted-foreground">Quick Links</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/resources/directory">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Directory</p>
                  <p className="text-sm text-muted-foreground">Locations</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Folders */}
        <section>
          <h2 className="text-xl font-bold mb-4">Browse by Folder</h2>
          <FolderGrid folders={folders} />
        </section>

        {/* Featured Files */}
        {featuredFiles.length > 0 && (
          <HorizontalScroll title="Featured Resources" subtitle="Popular files and materials">
            {featuredFiles.map((file) => (
              <div key={file.id} className="min-w-[250px] flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
                <ResourceCard
                  resource={file}
                  isFavorite={isFavorite("file", String(file.id))}
                  onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                  onLogEvent={(eventType) => logEvent("file", String(file.id), eventType)}
                />
              </div>
            ))}
          </HorizontalScroll>
        )}

        {/* Ambassadors */}
        {featuredAmbassadors.length > 0 && (
          <HorizontalScroll title="Ambassador Clips" subtitle="Celebrity endorsements and testimonials">
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
            <h2 className="text-xl font-bold mb-4">Quick Links</h2>
            <QuickLinksGrid
              links={links}
              favorites={linkFavorites}
              onToggleFavorite={(id) => toggleFavorite("link", id)}
              onLogEvent={(id, eventType) => logEvent("link", id, eventType)}
            />
          </section>
        )}
      </main>
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
