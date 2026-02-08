import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, Play, FolderOpen, Eye, Plus, Pencil, ArrowLeft } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import AdminFileDialog from "../admin/AdminFileDialog";

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
}

interface ResourceFolder {
  id: string;
  folder_name: string;
  images: string | null;
  is_active: boolean;
}

interface FilesSectionProps {
  searchQuery: string;
}

export default function FilesSection({ searchQuery }: FilesSectionProps) {
  const { isAdmin } = useAuth();
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<ResourceFolder | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FileItem | null>(null);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (activeFolder) {
      fetchItems(activeFolder.folder_name);
    }
  }, [activeFolder]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("resource_folders")
        .select("*")
        .eq("is_active", true)
        .order("folder_name", { ascending: true });
      if (error) throw error;
      setFolders(data || []);
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
        .eq("is_active", true)
        .eq("folder_name", folderName)
        .order("sort_order", { ascending: true })
        .order("file_name", { ascending: true });
      if (error) throw error;
      setItems(data || []);
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

  const handleEdit = (item: FileItem) => {
    setEditingItem(item);
    setAdminDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setAdminDialogOpen(true);
  };

  const handleBackToFolders = () => {
    setActiveFolder(null);
    setItems([]);
  };

  if (loading) return <ToolsSkeleton type="grid" count={4} />;

  // ── Inside a folder ──
  if (activeFolder) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={handleBackToFolders}>
          <ArrowLeft className="w-4 h-4" /> Back to Folders
        </Button>

        <h2 className="text-xl font-bold text-foreground">{activeFolder.folder_name}</h2>

        {isAdmin && (
          <Button onClick={handleAdd} className="w-full gap-2">
            <Plus className="w-4 h-4" /> Add File
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const thumbnail = getThumbnail(item.images);
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-2xl overflow-hidden relative",
                  "bg-card border border-border/50 shadow-md",
                  "hover:shadow-lg hover:border-primary/30 transition-all"
                )}
              >
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
                </div>

                <div className="p-3 space-y-2">
                  <h4 className="font-semibold text-foreground text-sm line-clamp-2 min-h-[40px]">
                    {item.file_name}
                  </h4>

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
            <p className="text-lg text-muted-foreground">No files in this folder yet</p>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedFile?.file_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedFile?.images && (
                <div className="rounded-xl overflow-hidden">
                  <img
                    src={getThumbnail(selectedFile.images) || ""}
                    alt={selectedFile.file_name}
                    className="w-full object-contain max-h-80"
                  />
                </div>
              )}
              {selectedFile?.description && (
                <p className="text-muted-foreground">{selectedFile.description}</p>
              )}
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

        <AdminFileDialog
          open={adminDialogOpen}
          onOpenChange={setAdminDialogOpen}
          item={editingItem}
          onSaved={() => fetchItems(activeFolder.folder_name)}
        />
      </div>
    );
  }

  // ── Folder grid view ──
  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button onClick={handleAdd} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add File
        </Button>
      )}

      {filteredFolders.length === 0 && !isAdmin && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No file folders available yet</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filteredFolders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolder(folder)}
            className={cn(
              "relative rounded-2xl overflow-hidden aspect-[4/3]",
              "bg-card border border-border/50 shadow-md",
              "hover:shadow-lg hover:border-primary/30 transition-all text-left group"
            )}
          >
            {folder.images ? (
              <img src={folder.images} alt={folder.folder_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <FolderOpen className="w-12 h-12 text-primary/40" />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
              <h3 className="text-sm font-semibold text-white line-clamp-2">{folder.folder_name}</h3>
            </div>
          </button>
        ))}
      </div>

      <AdminFileDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        item={editingItem}
        onSaved={fetchFolders}
      />
    </div>
  );
}
