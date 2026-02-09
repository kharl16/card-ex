import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Plus, Pencil, FolderOpen, ArrowLeft } from "lucide-react";
import ToolsSkeleton from "../ToolsSkeleton";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";
import AdminTrainingDialog from "../admin/AdminTrainingDialog";
import AdminVideoFolderDialog from "../admin/AdminVideoFolderDialog";
import AdminAmbassadorClipDialog from "../admin/AdminAmbassadorClipDialog";

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

interface AmbassadorClip {
  id: string;
  endorser: string | null;
  product_endorsed: string | null;
  thumbnail: string | null;
  video_file_url: string | null;
  drive_link: string | null;
  drive_share_link: string | null;
  folder_name: string | null;
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

const AMBASSADOR_FOLDER = "Ambassador Clips";

export default function TrainingsSection({ searchQuery }: TrainingsSectionProps) {
  const { isAdmin } = useAuth();
  const [folders, setFolders] = useState<VideoFolder[]>([]);
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [ambassadorClips, setAmbassadorClips] = useState<AmbassadorClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<TrainingItem | null>(null);
  const [activeFolder, setActiveFolder] = useState<VideoFolder | null>(null);

  // Admin dialogs
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<VideoFolder | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TrainingItem | null>(null);
  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [editingClip, setEditingClip] = useState<AmbassadorClip | null>(null);

  const isAmbassadorFolder = activeFolder?.folder_name === AMBASSADOR_FOLDER;

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (activeFolder) {
      if (activeFolder.folder_name === AMBASSADOR_FOLDER) {
        fetchAmbassadorClips();
      } else {
        fetchItems(activeFolder.folder_name);
      }
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

  const fetchAmbassadorClips = async () => {
    try {
      const { data, error } = await supabase
        .from("ambassadors_library")
        .select("*")
        .eq("is_active", true)
        .order("endorser", { ascending: true });
      if (error) throw error;
      setAmbassadorClips(data || []);
    } catch (err) {
      console.error("Error fetching ambassador clips:", err);
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

  const filteredClips = ambassadorClips.filter(
    (clip) =>
      !searchQuery ||
      clip.endorser?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.product_endorsed?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleWatchClip = (clip: AmbassadorClip) => {
    const url = clip.video_file_url || clip.drive_share_link || clip.drive_link;
    if (url) window.open(url, "_blank");
  };

  const handleBackToFolders = () => {
    setActiveFolder(null);
    setItems([]);
    setAmbassadorClips([]);
  };

  if (loading) return <ToolsSkeleton type="card" count={4} />;

  // ── Inside a folder ──
  if (activeFolder) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={handleBackToFolders}>
          <ArrowLeft className="w-4 h-4" /> Back to Folders
        </Button>

        <h2 className="text-xl font-bold text-foreground">{activeFolder.folder_name}</h2>

        {/* Ambassador Clips view */}
        {isAmbassadorFolder ? (
          <AmbassadorClipsView
            clips={filteredClips}
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            onEdit={(clip) => { setEditingClip(clip); setClipDialogOpen(true); }}
            onAdd={() => { setEditingClip(null); setClipDialogOpen(true); }}
            onWatch={handleWatchClip}
          />
        ) : (
          <VideoItemsView
            items={filteredItems}
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            onEdit={(item) => { setEditingVideo(item); setVideoDialogOpen(true); }}
            onAdd={() => { setEditingVideo(null); setVideoDialogOpen(true); }}
            onWatch={handleWatch}
          />
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

        <AdminAmbassadorClipDialog
          open={clipDialogOpen}
          onOpenChange={setClipDialogOpen}
          item={editingClip}
          defaultFolderName={AMBASSADOR_FOLDER}
          onSaved={fetchAmbassadorClips}
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

      <AdminVideoFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={editingFolder}
        onSaved={fetchFolders}
      />
    </div>
  );
}

// ── Sub-components ──

function VideoItemsView({
  items,
  isAdmin,
  searchQuery,
  onEdit,
  onAdd,
  onWatch,
}: {
  items: TrainingItem[];
  isAdmin: boolean;
  searchQuery: string;
  onEdit: (item: TrainingItem) => void;
  onAdd: () => void;
  onWatch: (item: TrainingItem) => void;
}) {
  return (
    <>
      {isAdmin && (
        <Button onClick={onAdd} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add Video
        </Button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
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
                variant="secondary" size="icon"
                className="absolute top-2 right-2 z-10 h-8 w-8"
                onClick={() => onEdit(item)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <div className="relative aspect-video bg-black">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Play className="w-12 h-12 text-primary/50" />
                </div>
              )}
              {item.video_url && (
                <button
                  onClick={() => onWatch(item)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary-foreground ml-1" />
                  </div>
                </button>
              )}
            </div>
            <div className="p-3 space-y-2">
              <h4 className="font-semibold text-foreground line-clamp-2 text-sm min-h-[40px]">{item.title}</h4>
              {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
              <Button onClick={() => onWatch(item)} className="w-full h-10 text-sm gap-2" disabled={!item.video_url}>
                <Play className="w-4 h-4" /> Watch
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No videos in this folder yet</p>
        </div>
      )}
    </>
  );
}

function AmbassadorClipsView({
  clips,
  isAdmin,
  searchQuery,
  onEdit,
  onAdd,
  onWatch,
}: {
  clips: AmbassadorClip[];
  isAdmin: boolean;
  searchQuery: string;
  onEdit: (clip: AmbassadorClip) => void;
  onAdd: () => void;
  onWatch: (clip: AmbassadorClip) => void;
}) {
  return (
    <>
      {isAdmin && (
        <Button onClick={onAdd} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add Ambassador Clip
        </Button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {clips.map((clip) => {
          const hasVideo = !!(clip.video_file_url || clip.drive_share_link || clip.drive_link);
          return (
            <div
              key={clip.id}
              className={cn(
                "rounded-2xl overflow-hidden relative",
                "bg-card border border-border/50 shadow-md",
                "hover:shadow-lg hover:border-primary/30 transition-all"
              )}
            >
              {isAdmin && (
                <Button
                  variant="secondary" size="icon"
                  className="absolute top-2 right-2 z-10 h-8 w-8"
                  onClick={() => onEdit(clip)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              <div className="relative aspect-video bg-black">
                {clip.thumbnail ? (
                  <img src={clip.thumbnail} alt={clip.endorser || "Ambassador"} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Play className="w-12 h-12 text-primary/50" />
                  </div>
                )}
                {hasVideo && (
                  <button
                    onClick={() => onWatch(clip)}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary-foreground ml-1" />
                    </div>
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                <h4 className="font-semibold text-foreground line-clamp-2 text-sm min-h-[40px]">
                  {clip.endorser || "Unknown Ambassador"}
                </h4>
                {clip.product_endorsed && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{clip.product_endorsed}</p>
                )}
                <Button onClick={() => onWatch(clip)} className="w-full h-10 text-sm gap-2" disabled={!hasVideo}>
                  <Play className="w-4 h-4" /> Watch
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {clips.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No ambassador clips yet</p>
        </div>
      )}
    </>
  );
}
