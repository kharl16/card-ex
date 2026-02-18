import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, Link as LinkIcon, Plus, Pencil, Share2 } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import AdminLinkDialog from "../admin/AdminLinkDialog";

interface IAMLink {
  id: string;
  name: string;
  link: string;
  category: string | null;
  icon_url: string | null;
  is_active: boolean;
}

interface LinksSectionProps {
  searchQuery: string;
}

export default function LinksSection({ searchQuery }: LinksSectionProps) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<IAMLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IAMLink | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("iam_links")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      setItems(data || []);

      // Extract unique categories
      const cats = [...new Set((data || []).map((item) => item.category).filter(Boolean))] as string[];
      setCategories(cats);
    } catch (err) {
      console.error("Error fetching links:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.link.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !activeCategory || item.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCopy = async (item: IAMLink) => {
    try {
      await navigator.clipboard.writeText(item.link);
      setCopiedId(item.id);
      toast.success("Link copied!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpen = (item: IAMLink) => {
    window.open(item.link, "_blank");
  };

  const handleShareLink = async (item: IAMLink) => {
    const shareText = `🔗 ${item.name}\n${item.link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.name, url: item.link });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Link info copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleEdit = (item: IAMLink) => {
    setEditingItem(item);
    setAdminDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setAdminDialogOpen(true);
  };

  if (loading) {
    return <ToolsSkeleton type="list" count={4} />;
  }

  if (items.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No links available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Add Button */}
      {isAdmin && (
        <Button onClick={handleAdd} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Link
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

      {/* Links Grid */}
      <div className="flex flex-col gap-3 w-full">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl w-full",
              "bg-card border border-border/50 shadow-sm",
              "hover:shadow-md hover:border-primary/30 transition-all"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center",
                "bg-gradient-to-br from-primary/20 to-primary/5",
                "border border-primary/20"
              )}
            >
              {item.icon_url ? (
                <img src={item.icon_url} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <LinkIcon className="w-5 h-5 text-primary" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-base truncate">{item.name}</h4>
              {item.category && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {item.category}
                </Badge>
              )}
            </div>

            {/* Actions - compact for mobile */}
            <div className="flex gap-1.5 flex-shrink-0">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleShareLink(item)}
                className="h-10 w-10 rounded-lg"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(item)}
                className="h-10 w-10 rounded-lg"
              >
                {copiedId === item.id ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => handleOpen(item)}
                size="icon"
                className="h-10 w-10 rounded-lg"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No links match your search</p>
        </div>
      )}

      {/* Admin Dialog */}
      <AdminLinkDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        item={editingItem}
        onSaved={fetchItems}
      />
    </div>
  );
}
