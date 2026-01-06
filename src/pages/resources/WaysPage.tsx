import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, ChevronDown, Heart, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";

function WaysPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const { ways, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  // Filtered ways
  const filteredWays = useMemo(() => {
    if (!searchTerm) return ways;
    const term = searchTerm.toLowerCase();
    return ways.filter((w) => w.content.toLowerCase().includes(term));
  }, [ways, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpandedItems(filteredWays.map((w) => w.id));
  };

  const collapseAll = () => {
    setExpandedItems([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
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
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">13 Ways</h1>
                <p className="text-sm text-muted-foreground">Essential guides and tips</p>
              </div>
            </div>
            <Badge variant="secondary" className="ml-auto text-base px-3 py-1">
              {filteredWays.length} items
            </Badge>
          </div>

          {/* Search and controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="lg" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredWays.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xl text-muted-foreground mb-4">No content found</p>
            {searchTerm && (
              <Button size="lg" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredWays.map((way, index) => {
              const favorite = isFavorite("way", way.id);
              const isExpanded = expandedItems.includes(way.id);
              
              // Extract first line as title if content has multiple lines
              const lines = way.content.split("\n").filter(Boolean);
              const title = lines[0] || `Way ${index + 1}`;
              const restContent = lines.slice(1).join("\n");
              
              return (
                <Card
                  key={way.id}
                  className="transition-all duration-300 hover:shadow-lg bg-card/80 backdrop-blur border-border/50"
                >
                  <CardContent className="p-0">
                    <div
                      className="flex items-start gap-4 p-6 cursor-pointer"
                      onClick={() => {
                        toggleExpand(way.id);
                        logEvent("way", way.id, "view");
                      }}
                    >
                      {/* Number badge */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">
                          {index + 1}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-semibold leading-relaxed">
                          {title}
                        </h3>
                        {isExpanded && restContent && (
                          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {restContent}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn(
                            "h-12 w-12",
                            favorite && "text-red-500"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite("way", way.id);
                          }}
                        >
                          <Heart
                            className={cn("h-6 w-6", favorite && "fill-current")}
                          />
                        </Button>
                        <ChevronDown
                          className={cn(
                            "h-6 w-6 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
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

export default function WaysPage() {
  return (
    <ResourcesProvider>
      <WaysPageContent />
    </ResourcesProvider>
  );
}
