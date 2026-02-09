import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download, Presentation, Plus, Pencil } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import AdminPresentationDialog from "../admin/AdminPresentationDialog";

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

      // Extract unique categories
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

  const handleEdit = (item: PresentationItem) => {
    setEditingItem(item);
    setAdminDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setAdminDialogOpen(true);
  };

  if (loading) {
    return <ToolsSkeleton type="grid" count={4} />;
  }

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
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-2xl overflow-hidden relative",
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

            {/* Thumbnail */}
            <div className="relative aspect-[4/3] bg-black">
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

              {/* Category badge */}
              {item.category && (
                <Badge className="absolute top-2 left-2 bg-black/60 text-white text-xs">
                  {item.category}
                </Badge>
              )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              <h4 className="font-semibold text-foreground text-sm line-clamp-2 min-h-[40px]">
                {item.title}
              </h4>

              {/* Actions */}
              <div className="flex gap-2">
                {item.presentation_url && (
                  <Button
                    size="sm"
                    className="flex-1 h-10 gap-1 text-xs"
                    onClick={() => window.open(item.presentation_url!, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
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
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No presentations match your search</p>
        </div>
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
