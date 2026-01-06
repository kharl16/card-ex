import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, ExternalLink, Copy, Heart, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";

function LinksPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const { links, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  // Filtered links
  const filteredLinks = useMemo(() => {
    let result = [...links];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.link.toLowerCase().includes(term)
      );
    }

    // Favorites only
    if (showFavoritesOnly) {
      result = result.filter((l) => isFavorite("link", l.id));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [links, searchTerm, showFavoritesOnly, isFavorite]);

  const handleCopy = async (link: typeof links[0]) => {
    try {
      await navigator.clipboard.writeText(link.link);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpen = (link: typeof links[0]) => {
    logEvent("link", link.id, "open_link");
    window.open(link.link, "_blank");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters = searchTerm || showFavoritesOnly;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
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
              <Button variant="ghost" size="lg" className="h-12 w-12">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <ExternalLink className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Quick Links</h1>
                <p className="text-sm text-muted-foreground">Important resources at your fingertips</p>
              </div>
            </div>
            <Badge variant="secondary" className="ml-auto text-base px-3 py-1">
              {filteredLinks.length} links
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search links..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>

            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="lg"
              className="h-12 gap-2"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart className={cn("h-5 w-5", showFavoritesOnly && "fill-current")} />
              Favorites
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="lg" className="h-12" onClick={clearFilters}>
                <X className="h-5 w-5 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredLinks.length === 0 ? (
          <div className="text-center py-16">
            <ExternalLink className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xl text-muted-foreground mb-4">No links found</p>
            {hasActiveFilters && (
              <Button size="lg" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLinks.map((link) => {
              const favorite = isFavorite("link", link.id);
              return (
                <Card
                  key={link.id}
                  className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 bg-card/80 backdrop-blur border-border/50"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg md:text-xl mb-2">{link.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{link.link}</p>
                      </div>
                      <Button
                        size="lg"
                        variant="ghost"
                        className={cn("h-12 w-12 flex-shrink-0", favorite && "text-red-500")}
                        onClick={() => toggleFavorite("link", link.id)}
                      >
                        <Heart className={cn("h-6 w-6", favorite && "fill-current")} />
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        className="flex-1 h-12 gap-2 text-base"
                        onClick={() => handleCopy(link)}
                      >
                        <Copy className="h-5 w-5" />
                        Copy
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        className="flex-1 h-12 gap-2 text-base"
                        onClick={() => handleOpen(link)}
                      >
                        <ExternalLink className="h-5 w-5" />
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function LinksPage() {
  return (
    <ResourcesProvider>
      <LinksPageContent />
    </ResourcesProvider>
  );
}
