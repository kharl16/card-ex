import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, ExternalLink, Plus, Pencil } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import AdminTrainingDialog from "../admin/AdminTrainingDialog";

interface TrainingItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  source_type: string | null;
  category: string | null;
  is_active: boolean;
}

interface TrainingsSectionProps {
  searchQuery: string;
}

export default function TrainingsSection({ searchQuery }: TrainingsSectionProps) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<TrainingItem | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrainingItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("training_items")
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
      console.error("Error fetching trainings:", err);
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

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, TrainingItem[]>);

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  };

  const handleWatch = (item: TrainingItem) => {
    if (!item.video_url) return;

    // For YouTube, open in modal
    if (item.source_type === "youtube" || item.video_url.includes("youtube") || item.video_url.includes("youtu.be")) {
      setSelectedVideo(item);
    } else {
      // For other sources, open externally
      window.open(item.video_url, "_blank");
    }
  };

  const handleEdit = (item: TrainingItem) => {
    setEditingItem(item);
    setAdminDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setAdminDialogOpen(true);
  };

  if (loading) {
    return <ToolsSkeleton type="card" count={4} />;
  }

  if (items.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No trainings available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Add Button */}
      {isAdmin && (
        <Button onClick={handleAdd} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Training
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

      {/* Content */}
      {Object.entries(groupedItems).map(([category, catItems]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">{category}</h3>

          {/* Horizontal Carousel */}
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex-shrink-0 w-64 rounded-2xl overflow-hidden relative",
                    "bg-card border border-border/50 shadow-md",
                    "hover:shadow-lg hover:border-primary/30 transition-all"
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
                  <div className="relative aspect-video bg-muted">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Play className="w-12 h-12 text-primary/50" />
                      </div>
                    )}
                    {/* Play overlay */}
                    {item.video_url && (
                      <button
                        onClick={() => handleWatch(item)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="w-6 h-6 text-primary-foreground ml-1" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h4 className="font-semibold text-foreground line-clamp-2 min-h-[48px]">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <Button
                      onClick={() => handleWatch(item)}
                      className="w-full h-12 text-base gap-2"
                      disabled={!item.video_url}
                    >
                      <Play className="w-5 h-5" />
                      Watch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      ))}

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No trainings match your search</p>
        </div>
      )}

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            {selectedVideo?.video_url && (
              <iframe
                src={getYouTubeEmbedUrl(selectedVideo.video_url) || selectedVideo.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Dialog */}
      <AdminTrainingDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        item={editingItem}
        onSaved={fetchItems}
      />
    </div>
  );
}
