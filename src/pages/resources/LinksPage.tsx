import { useState, useMemo } from "react";
import { Search, ExternalLink, Copy, Heart, X, Plus, Pencil, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { shareResourceLink } from "@/lib/shareResourceLink";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { useSearchQueryParam } from "@/hooks/useSearchQueryParam";
import AdminLinkDialog from "@/components/tools/admin/AdminLinkDialog";
import { useAuth } from "@/contexts/AuthContext";
import { PageBackButton } from "@/components/PageBackButton";

function LinksPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  useSearchQueryParam(setSearchTerm);

  const { links, loading, toggleFavorite, logEvent, isFavorite, refetch } = useResourceData();
  const { isSuperAdmin } = useAuth();
  const [editItem, setEditItem] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleShare = (link: typeof links[0]) => {
    logEvent("link", link.id, "share");
    void shareResourceLink({ name: link.name, link: link.link });
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div data-links-header className="mb-4 flex items-center gap-3 sm:gap-4">
            <PageBackButton to="/dashboard" />
            <div className="hidden shrink-0 rounded-full bg-primary/10 p-3 sm:block">
              <ExternalLink className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold sm:text-2xl md:text-3xl">Quick Links</h1>
                <Badge
                  variant="secondary"
                  data-links-count
                  className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1 text-base font-semibold sm:px-4 sm:py-1.5 sm:text-lg"
                >
                  {filteredLinks.length} {filteredLinks.length === 1 ? "link" : "links"}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">Important resources at your fingertips</p>
            </div>
            {isSuperAdmin && (
              <Button
                size="lg"
                className="hidden h-12 shrink-0 gap-2 sm:inline-flex"
                onClick={() => {
                  setEditItem(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-5 w-5" />
                Add Link
              </Button>
            )}
          </div>

          {/* Filters */}
          <div data-links-filters className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:min-w-[200px] sm:max-w-md sm:flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search links..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 text-base sm:text-lg"
              />
            </div>

            <div className={cn("grid gap-3 sm:flex", isSuperAdmin ? "grid-cols-2" : "grid-cols-1")}>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="lg"
                className="h-12 min-w-0 gap-2"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Heart className={cn("h-5 w-5", showFavoritesOnly && "fill-current")} />
                Favorites
              </Button>
              {isSuperAdmin && (
                <Button
                  size="lg"
                  data-links-add-mobile
                  className="h-12 min-w-0 gap-2 sm:hidden"
                  onClick={() => {
                    setEditItem(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-5 w-5" />
                  Add Link
                </Button>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn("h-12", isSuperAdmin && "col-span-2")}
                  onClick={clearFilters}
                >
                  <X className="mr-2 h-5 w-5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-5 sm:py-8">
        {filteredLinks.length === 0 ? (
          <div className="text-center py-16">
            <ExternalLink className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xl text-muted-foreground mb-4">No links found</p>
            {hasActiveFilters && (
              <Button size="lg" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredLinks.map((link) => {
              const favorite = isFavorite("link", link.id);
              return (
                <Card
                  key={link.id}
                  className="group rounded-2xl border-primary/40 bg-card/80 backdrop-blur transition-all duration-300 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1.5 text-lg font-semibold leading-snug md:text-xl">{link.name}</h3>
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => logEvent("link", link.id, "open_link")}
                          className="block truncate text-sm text-blue-400 underline-offset-2 hover:text-blue-300 hover:underline"
                        >
                          {link.link}
                        </a>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                        className={cn("-mr-2 -mt-1 h-11 w-11 shrink-0", favorite && "text-red-500")}
                        onClick={() => toggleFavorite("link", link.id)}
                      >
                        <Heart className={cn("h-6 w-6", favorite && "fill-current")} />
                      </Button>
                    </div>
                    <div
                      data-link-actions
                      className={cn("grid gap-2 sm:gap-3", isSuperAdmin ? "grid-cols-3" : "grid-cols-2")}
                    >
                      {isSuperAdmin && (
                        <Button
                          variant="secondary"
                          size="lg"
                          className="h-12 min-w-0 gap-1.5 px-2 text-sm sm:gap-2 sm:px-4 sm:text-base"
                          onClick={() => {
                            setEditItem(link);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 min-w-0 gap-1.5 px-2 text-sm sm:gap-2 sm:px-4 sm:text-base"
                        onClick={() => handleCopy(link)}
                      >
                        <Copy className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                        Copy
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        className="h-12 min-w-0 gap-1.5 px-2 text-sm sm:gap-2 sm:px-4 sm:text-base"
                        onClick={() => handleShare(link)}
                      >
                        <Share2 className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {isSuperAdmin && (
        <AdminLinkDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editItem}
          onSaved={() => refetch()}
        />
      )}
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
