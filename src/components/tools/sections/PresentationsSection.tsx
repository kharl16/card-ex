import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Presentation, Plus, Pencil, Share2 } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AdminPresentationDialog from "../admin/AdminPresentationDialog";
import PresentationViewerDialog from "./PresentationViewerDialog";
import { detectPresentationSource } from "@/lib/presentationUtils";

interface PresentationItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  presentation_url: string | null;
  download_url: string | null;
  category: string | null;
  is_active: boolean;
}

interface PresentationsSectionProps {
  searchQuery: string;
}

export default function PresentationsSection({ searchQuery }: PresentationsSectionProps) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<PresentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PresentationItem | null>(null);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<PresentationItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("presentations")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      setItems(data || []);
      const cats = [...new Set((data || []).map((item) => item.category).filter(Boolean))] as string[];
      setCategories(cats);
    } catch (err) {
      console.error("Error fetching presentations:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePresent = (item: PresentationItem) => {
    if (!item.presentation_url) {
      toast.error("No presentation URL available");
      return;
    }
    setViewerItem(item);
    setViewerOpen(true);
  };

  const handleEdit = (item: PresentationItem) => {
    setEditingItem(item);
    setAdminDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setAdminDialogOpen(true);
  };

  if (loading) return <ToolsSkeleton type="grid" count={4} />;

  if (items.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No presentations available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Add Button */}
      {isAdmin && (
        <Button onClick={handleAdd} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Presentation
        </Button>
      )}

      {/* Category Filter */}
      {categories.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Badge
              variant={activeCategory === null ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-4 py-2 text-sm",
                activeCategory === null && "bg-primary text-primary-foreground"
              )}
              onClick={() => setActiveCategory(null)}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-4 py-2 text-sm whitespace-nowrap",
                  activeCategory === cat && "bg-primary text-primary-foreground"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Presentations Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const source = item.presentation_url ? detectPresentationSource(item.presentation_url) : null;

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-2xl overflow-hidden relative group",
                "bg-card border border-border/50 shadow-sm",
                "hover:shadow-md hover:border-primary/30 transition-all"
              )}
            >
              {/* Admin Edit Button */}
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-8 w-8"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}

              {/* Thumbnail - clickable to present */}
              <button
                className="relative aspect-[4/3] bg-black w-full cursor-pointer"
                onClick={() => handlePresent(item)}
                disabled={!item.presentation_url}
              >
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Presentation className="w-12 h-12 text-primary/50" />
                  </div>
                )}

                {/* Play overlay on hover */}
                {item.presentation_url && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-primary rounded-full p-3 shadow-lg">
                      <Play className="w-6 h-6 text-primary-foreground fill-current" />
                    </div>
                  </div>
                )}

                {/* Category + source badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {item.category && (
                    <Badge className="bg-black/60 text-white text-xs">{item.category}</Badge>
                  )}
                  {source && (
                    <Badge variant="outline" className="bg-black/60 text-white/80 text-xs border-white/20">
                      {source}
                    </Badge>
                  )}
                </div>
              </button>

              {/* Info */}
              <div className="p-3 space-y-2">
                <h4 className="font-semibold text-foreground text-sm line-clamp-2 min-h-[40px]">
                  {item.title}
                </h4>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {item.presentation_url && (
                    <Button
                      size="sm"
                      className="flex-1 h-10 gap-1 text-xs"
                      onClick={() => handlePresent(item)}
                    >
                      <Play className="w-4 h-4" />
                      Present
                    </Button>
                  )}
                  {item.download_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 gap-1 text-xs"
                      onClick={() => window.open(item.download_url!, "_blank")}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-8 gap-1 text-xs text-muted-foreground"
                  onClick={async () => {
                    const shareUrl = item.presentation_url || item.download_url || "";
                    const shareText = `📊 ${item.title}${item.description ? `\n${item.description}` : ""}${shareUrl ? `\n${shareUrl}` : ""}`;
                    if (navigator.share) {
                      try { await navigator.share({ title: item.title, text: shareText }); return; } catch (err) { if ((err as Error).name === "AbortError") return; }
                    }
                    try { await navigator.clipboard.writeText(shareText); toast.success("Presentation info copied!"); } catch { toast.error("Failed to copy"); }
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No presentations match your search</p>
        </div>
      )}

      {/* Viewer Dialog */}
      {viewerItem && (
        <PresentationViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          title={viewerItem.title}
          url={viewerItem.presentation_url!}
        />
      )}

      {/* Admin Dialog */}
      <AdminPresentationDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        item={editingItem}
        onSaved={fetchItems}
      />
    </div>
  );
}
