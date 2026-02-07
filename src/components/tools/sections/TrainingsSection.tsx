import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Plus, Pencil, FolderOpen, ArrowLeft } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import AdminTrainingDialog from "../admin/AdminTrainingDialog";
import AdminVideoFolderDialog from "../admin/AdminVideoFolderDialog";

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

interface VideoFolder {
  id: string;
  folder_name: string;
  images: string | null;
  is_active: boolean;
}

interface TrainingsSectionProps {
  searchQuery: string;
}

export default function TrainingsSection({ searchQuery }: TrainingsSectionProps) {
  const { isAdmin } = useAuth();
  const [folders, setFolders] = useState<VideoFolder[]>([]);
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<TrainingItem | null>(null);
  const [activeFolder, setActiveFolder] = useState<VideoFolder | null>(null);

  // Admin dialogs
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<VideoFolder | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TrainingItem | null>(null);

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
        .from("training_folders")
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
        .from("training_items")
        .select("*")
        .eq("is_active", true)
        .eq("category", folderName)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching videos:", err);
    }
  };

  const filteredFolders = folders.filter(
    (f) => !searchQuery || f.folder_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredItems = items.filter(
    (item) =>
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  };

  const handleWatch = (item: TrainingItem) => {
    if (!item.video_url) return;
    if (item.source_type === "youtube" || item.video_url.includes("youtube") || item.video_url.includes("youtu.be")) {
      setSelectedVideo(item);
    } else {
      window.open(item.video_url, "_blank");
    }
  };

  if (loading) return <ToolsSkeleton type="card" count={4} />;

  // ── Inside a folder: show videos ──
  if (activeFolder) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => { setActiveFolder(null); setItems([]); }}>
          <ArrowLeft className="w-4 h-4" /> Back to Folders
        </Button>

        <h2 className="text-xl font-bold text-foreground">{activeFolder.folder_name}</h2>

        {isAdmin && (
          <Button onClick={() => { setEditingVideo(null); setVideoDialogOpen(true); }} className="w-full gap-2">
            <Plus className="w-4 h-4" /> Add Video
          </Button>
        )}

        {/* Video cards */}
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex-shrink-0 w-64 rounded-2xl overflow-hidden relative",
                  "bg-card border border-border/50 shadow-md",
                  "hover:shadow-lg hover:border-primary/30 transition-all"
                )}
              >
                {isAdmin && (
                  <Button
                    variant="secondary" size="icon"
                    className="absolute top-2 right-2 z-10 h-8 w-8"
                    onClick={() => { setEditingVideo(item); setVideoDialogOpen(true); }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                <div className="relative aspect-video bg-muted">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Play className="w-12 h-12 text-primary/50" />
                    </div>
                  )}
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
                <div className="p-4 space-y-2">
                  <h4 className="font-semibold text-foreground line-clamp-2 min-h-[48px]">{item.title}</h4>
                  {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                  <Button onClick={() => handleWatch(item)} className="w-full h-12 text-base gap-2" disabled={!item.video_url}>
                    <Play className="w-5 h-5" /> Watch
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No videos in this folder yet</p>
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

        <AdminTrainingDialog
          open={videoDialogOpen}
          onOpenChange={setVideoDialogOpen}
          item={editingVideo}
          defaultCategory={activeFolder.folder_name}
          onSaved={() => fetchItems(activeFolder.folder_name)}
        />
      </div>
    );
  }

  // ── Folder grid view ──
  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button onClick={() => { setEditingFolder(null); setFolderDialogOpen(true); }} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add Folder
        </Button>
      )}

      {filteredFolders.length === 0 && !isAdmin && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No video folders available yet</p>
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
            {isAdmin && (
              <div
                className="absolute top-2 right-2 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingFolder(folder);
                  setFolderDialogOpen(true);
                }}
              >
                <Badge variant="secondary" className="h-8 w-8 p-0 flex items-center justify-center">
                  <Pencil className="w-3.5 h-3.5" />
                </Badge>
              </div>
            )}

            {folder.images ? (
              <img src={folder.images} alt={folder.folder_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <FolderOpen className="w-12 h-12 text-primary/40" />
              </div>
            )}

            {/* Overlay label */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
              <h3 className="text-sm font-semibold text-white line-clamp-2">{folder.folder_name}</h3>
            </div>
          </button>
        ))}
      </div>

      <AdminVideoFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={editingFolder}
        onSaved={fetchFolders}
      />
    </div>
  );
}
