import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, Play, FolderOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
}

interface FilesSectionProps {
  searchQuery: string;
}

export default function FilesSection({ searchQuery }: FilesSectionProps) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("files_repository")
        .select("*")
        .eq("is_active", true)
        .order("folder_name", { ascending: true })
        .order("file_name", { ascending: true });

      if (error) throw error;

      setItems(data || []);

      // Extract unique folders
      const uniqueFolders = [...new Set((data || []).map((item) => item.folder_name).filter(Boolean))] as string[];
      setFolders(uniqueFolders);
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.folder_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFolder = !activeFolder || item.folder_name === activeFolder;

    return matchesSearch && matchesFolder;
  });

  const getThumbnail = (images: string | null): string | null => {
    if (!images) return null;
    // Handle comma-separated URLs or single URL
    const urls = images.split(",").map((u) => u.trim()).filter(Boolean);
    return urls[0] || null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No files available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Folder Filter */}
      {folders.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Badge
              variant={activeFolder === null ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-4 py-2 text-sm gap-2",
                activeFolder === null && "bg-primary text-primary-foreground"
              )}
              onClick={() => setActiveFolder(null)}
            >
              <FolderOpen className="w-4 h-4" />
              All Folders
            </Badge>
            {folders.map((folder) => (
              <Badge
                key={folder}
                variant={activeFolder === folder ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-4 py-2 text-sm whitespace-nowrap gap-2",
                  activeFolder === folder && "bg-primary text-primary-foreground"
                )}
                onClick={() => setActiveFolder(folder)}
              >
                <FolderOpen className="w-4 h-4" />
                {folder}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Files Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const thumbnail = getThumbnail(item.images);

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-2xl overflow-hidden",
                "bg-card border border-border/50 shadow-sm",
                "hover:shadow-md hover:border-primary/30 transition-all"
              )}
            >
              {/* Thumbnail */}
              <div
                className="relative aspect-square bg-muted cursor-pointer"
                onClick={() => setSelectedFile(item)}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={item.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <FolderOpen className="w-12 h-12 text-primary/50" />
                  </div>
                )}

                {/* Folder badge */}
                {item.folder_name && (
                  <Badge className="absolute top-2 left-2 bg-black/60 text-white text-xs">
                    {item.folder_name}
                  </Badge>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <h4 className="font-semibold text-foreground text-sm line-clamp-2 min-h-[40px]">
                  {item.file_name}
                </h4>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  {item.drive_link_download && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 gap-1 text-xs"
                      onClick={() => window.open(item.drive_link_download!, "_blank")}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  )}
                  {item.drive_link_share && !item.drive_link_download && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 gap-1 text-xs"
                      onClick={() => window.open(item.drive_link_share!, "_blank")}
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  )}
                  {item.view_video_url && (
                    <Button
                      size="sm"
                      className="flex-1 h-10 gap-1 text-xs"
                      onClick={() => window.open(item.view_video_url!, "_blank")}
                    >
                      <Play className="w-4 h-4" />
                      Watch
                    </Button>
                  )}
                  {!item.drive_link_download && !item.drive_link_share && !item.view_video_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 gap-1 text-xs"
                      onClick={() => setSelectedFile(item)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No files match your search</p>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedFile?.file_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image */}
            {selectedFile?.images && (
              <div className="rounded-xl overflow-hidden">
                <img
                  src={getThumbnail(selectedFile.images) || ""}
                  alt={selectedFile.file_name}
                  className="w-full object-contain max-h-80"
                />
              </div>
            )}

            {/* Description */}
            {selectedFile?.description && (
              <p className="text-muted-foreground">{selectedFile.description}</p>
            )}

            {/* Pricing */}
            <div className="flex gap-4">
              {selectedFile?.price_dp && (
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">DP Price</p>
                  <p className="font-semibold text-lg">{selectedFile.price_dp}</p>
                </div>
              )}
              {selectedFile?.price_srp && (
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">SRP Price</p>
                  <p className="font-semibold text-lg">{selectedFile.price_srp}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {selectedFile?.drive_link_download && (
                <Button
                  className="flex-1 h-12 gap-2"
                  onClick={() => window.open(selectedFile.drive_link_download!, "_blank")}
                >
                  <Download className="w-5 h-5" />
                  Download
                </Button>
              )}
              {selectedFile?.drive_link_share && (
                <Button
                  variant="outline"
                  className="flex-1 h-12 gap-2"
                  onClick={() => window.open(selectedFile.drive_link_share!, "_blank")}
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>
              )}
              {selectedFile?.view_video_url && (
                <Button
                  variant="secondary"
                  className="flex-1 h-12 gap-2"
                  onClick={() => window.open(selectedFile.view_video_url!, "_blank")}
                >
                  <Play className="w-5 h-5" />
                  Watch
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
