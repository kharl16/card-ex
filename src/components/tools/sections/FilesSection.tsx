import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, Play, FolderOpen, Eye, ArrowLeft } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
        .select("folder_name, images")
        .eq("is_active", true);
      if (error) throw error;

      const folderMap = new Map<string, ResourceFolder>();
      (data || []).forEach((row: any) => {
        const name = row.folder_name;
        if (name && !folderMap.has(name)) {
          folderMap.set(name, {
            id: name,
            folder_name: name,
            images: row.images || null,
            is_active: true,
          });
        }
      });

      const folderList = Array.from(folderMap.values()).sort((a, b) =>
        a.folder_name.localeCompare(b.folder_name)
      );
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
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={handleBackToFolders}>
          <ArrowLeft className="w-4 h-4" /> Back to Folders
        </Button>

        <h2 className="text-xl font-bold text-foreground">{activeFolder.folder_name}</h2>

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
                <div
                  className="relative aspect-square bg-black cursor-pointer"
                  onClick={() => setSelectedFile(item)}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={item.file_name}
                      className="w-full h-full object-contain"
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
                        <Eye className="w-4 h-4" />
                        View
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-8 gap-1 text-xs text-muted-foreground"
                    onClick={() => handleShareFile(item)}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No resources in this folder yet</p>
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

              {/* Per-package metrics */}
              {selectedFile && (() => {
                const f = selectedFile;
                const rows: Array<[string, string]> = [];
                const push = (label: string, v: unknown) => {
                  if (v === null || v === undefined) return;
                  const s = String(v).trim();
                  if (s) rows.push([label, s]);
                };
                push("Unilevel Points", f.unilevel_points);
                push("Package Points (SMC)", f.package_points_smc);
                push("RQV", f.rqv);
                push("Infinity", f.infinity);
                push("Check Match", f.check_match);
                push("Give Me 5", f.give_me_5);
                push("Just 4 You", f.just_4_you);
                push("Wholesale Commission", f.wholesale_package_commission);
                if (rows.length === 0) return null;
                return (
                  <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:[&>*:nth-child(odd)]:border-r divide-border/50 sm:[&>*:nth-child(n+3)]:border-t">
                      {rows.map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-3 px-3 py-2 border-border/50">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-foreground font-mono text-right">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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

  // ── Folder grid view ──
  return (
    <div className="space-y-4">
      {filteredFolders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No resource folders available yet</p>
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
              <img src={folder.images} alt={folder.folder_name} className="w-full h-full object-contain bg-black" />
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
    </div>
  );
}
