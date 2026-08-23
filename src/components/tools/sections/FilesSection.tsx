import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play, FolderOpen, ArrowLeft } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import type { FileResource } from "@/types/resources";
import { resourceImageUrl } from "@/lib/resourceImage";


interface FileItem {
  id: number;
  file_name: string;
  description: string | null;
  images: string | null;
  folder_name: string | null;
  drive_link_download: string | null;
  drive_link_share: string | null;
  view_video_url: string | null;
  price_dp: string | null;
  price_srp: string | null;
  is_active: boolean;
  unilevel_points: string | null;
  package_points_smc: string | null;
  rqv: string | null;
  infinity: string | null;
  check_match: string | null;
  give_me_5: string | null;
  just_4_you: string | null;
  wholesale_package_commission: string | null;
}

interface ResourceFolder {
  id: string;
  folder_name: string;
  images: string | null;
  is_active: boolean;
  min_sort: number;
}

interface FilesSectionProps {
  searchQuery: string;
}

export default function FilesSection({ searchQuery }: FilesSectionProps) {
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<ResourceFolder | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (activeFolder) {
      fetchItems(activeFolder.folder_name);
    }
  }, [activeFolder]);

  const mapRow = (row: any): FileItem => ({
    id: row.id,
    file_name: row.file_name || "",
    description: row.description || null,
    images: row.images || null,
    folder_name: row.folder_name || null,
    drive_link_download: row.drive_link_download || null,
    drive_link_share: row.drive_link_share || null,
    view_video_url: row.view_video_url || null,
    price_dp: row.price_dp || null,
    price_srp: row.price_srp || null,
    is_active: row.is_active ?? true,
    unilevel_points: row.unilevel_points != null ? String(row.unilevel_points) : null,
    package_points_smc: row.package_points_smc || null,
    rqv: row.rqv || null,
    infinity: row.infinity || null,
    check_match: row.check_match || null,
    give_me_5: row.give_me_5 || null,
    just_4_you: row.just_4_you || null,
    wholesale_package_commission: row.wholesale_package_commission || null,
  });

  const fetchFolders = async () => {
    try {
      // Read from the same source as the Dashboard Resources Hub
      const { data, error } = await supabase
        .from("files_repository")
        .select("folder_name, images, sort_order")
        .eq("is_active", true);
      if (error) throw error;

      const folderMap = new Map<string, ResourceFolder>();
      (data || []).forEach((row: any) => {
        const name = row.folder_name;
        if (!name) return;
        const sortVal = row.sort_order ?? Number.MAX_SAFE_INTEGER;
        const existing = folderMap.get(name);
        if (!existing) {
          folderMap.set(name, {
            id: name,
            folder_name: name,
            images: row.images || null,
            is_active: true,
            min_sort: sortVal,
          });
        } else {
          if (sortVal < existing.min_sort) {
            existing.min_sort = sortVal;
            if (row.images) existing.images = row.images;
          }
        }
      });

      const folderList = Array.from(folderMap.values()).sort((a, b) => {
        if (a.min_sort !== b.min_sort) return a.min_sort - b.min_sort;
        return a.folder_name.localeCompare(b.folder_name);
      });
      setFolders(folderList);
    } catch (err) {
      console.error("Error fetching folders:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (folderName: string) => {
    try {
      const { data, error } = await supabase
        .from("files_repository")
        .select("*")
        .eq("folder_name", folderName)
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("file_name", { ascending: true });
      if (error) throw error;
      setItems((data || []).map(mapRow));
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };


  const filteredFolders = folders.filter(
    (f) => !searchQuery || f.folder_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredItems = items.filter(
    (item) =>
      !searchQuery ||
      item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getThumbnail = (images: string | null): string | null => {
    if (!images) return null;
    const urls = images.split(",").map((u) => u.trim()).filter(Boolean);
    return urls[0] || null;
  };

  const handleBackToFolders = () => {
    setActiveFolder(null);
    setItems([]);
  };

  const handleShareFile = async (item: FileItem) => {
    const shareUrl = item.drive_link_share || item.drive_link_download || item.view_video_url || "";
    const shareText = `📁 ${item.file_name}${item.description ? `\n${item.description}` : ""}${shareUrl ? `\n${shareUrl}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.file_name, text: shareText });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("File info copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) return <ToolsSkeleton type="grid" count={4} />;

  // ── Inside a folder ──
  if (activeFolder) {
    return (
      <div className="space-y-3 min-w-0 overflow-x-hidden">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 h-8" onClick={handleBackToFolders}>
          <ArrowLeft className="w-4 h-4" /> Back to Folders
        </Button>

        <h2 className="text-base font-bold text-foreground truncate">{activeFolder.folder_name}</h2>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 min-w-0">
          {filteredItems.map((item) => {
            const thumbnail = getThumbnail(item.images);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedFile(item)}
                className={cn(
                  "group relative overflow-hidden rounded-xl text-left",
                  "bg-card border border-border/40 shadow-sm",
                  "hover:shadow-lg hover:border-primary/30 transition-all"
                )}
              >
                <div className="relative aspect-square overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={resourceImageUrl(thumbnail)}
                      alt={item.file_name}
                      className="w-full h-full object-contain bg-black/90 group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <FolderOpen className="w-8 h-8 text-primary/50" />
                    </div>
                  )}
                  {item.view_video_url && (
                    <div className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </div>
                  )}
                </div>
                {/* Caption below the photo so it never overlaps image content */}
                <div className="p-2 border-t border-border/20">
                  <h3 className="font-medium text-foreground text-[11px] leading-snug line-clamp-2">
                    {item.file_name}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-base text-muted-foreground">No resources in this folder yet</p>
          </div>
        )}



        {/* Detail Modal — shared with dashboard: swipe + prev/next arrows */}
        <FilePreviewDialog
          file={(selectedFile as unknown as FileResource) || null}
          files={filteredItems as unknown as FileResource[]}
          open={!!selectedFile}
          onOpenChange={(o) => { if (!o) setSelectedFile(null); }}
          isFavorite={false}
          onToggleFavorite={() => { /* favorites not exposed inside Tools Orb */ }}
          onLogEvent={() => { /* no-op */ }}
          onNavigate={(f) => setSelectedFile(f as unknown as FileItem)}
        />

      </div>
    );
  }

  // ── Folder grid view ──
  return (
    <div className="space-y-3 min-w-0 overflow-x-hidden">
      {filteredFolders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-base text-muted-foreground">No resource folders available yet</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 min-w-0">
        {filteredFolders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolder(folder)}
            className={cn(
              "relative rounded-xl overflow-hidden aspect-square",
              "bg-card border border-border/40 shadow-sm",
              "hover:shadow-lg hover:border-primary/30 transition-all text-left group"
            )}
          >
            {folder.images ? (
              <img src={resourceImageUrl(folder.images)} alt={folder.folder_name} className="w-full h-full object-contain bg-black/90" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <FolderOpen className="w-10 h-10 text-primary/40" />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
              <h3 className="text-[11px] font-semibold text-white line-clamp-2 drop-shadow-lg">{folder.folder_name}</h3>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

