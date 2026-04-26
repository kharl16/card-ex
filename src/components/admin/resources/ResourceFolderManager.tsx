import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, FolderPlus, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import type { ResourceFolder } from "@/types/resources";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function ResourceFolderManager({ open, onOpenChange, onChanged }: Props) {
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("resource_folders")
      .select("*")
      .order("folder_name");
    if (error) toast.error("Failed to load folders");
    else setFolders((data as ResourceFolder[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `folder-thumbs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("resources").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("resources").getPublicUrl(path);
      setImageUrl(pub.publicUrl);
      toast.success("Thumbnail uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addFolder = async () => {
    if (!name.trim()) {
      toast.error("Folder name is required");
      return;
    }
    const { error } = await supabase.from("resource_folders").insert({
      folder_name: name.trim(),
      images: imageUrl || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Folder added");
    setName("");
    setImageUrl("");
    load();
    onChanged?.();
  };

  const removeFolder = async (id: string) => {
    if (!confirm("Delete this folder? Files inside it won't be deleted.")) return;
    const { error } = await supabase.from("resource_folders").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Folder deleted");
    load();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" /> Manage Folders
          </DialogTitle>
          <DialogDescription>
            Create folders to group files. Each folder can have a thumbnail image.
          </DialogDescription>
        </DialogHeader>

        <Card className="p-4 space-y-3 bg-muted/30">
          <div className="space-y-2">
            <Label>Folder name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Health Products"
            />
          </div>
          <div className="space-y-2">
            <Label>Thumbnail (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL or upload"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploading}
                onClick={() => {
                  const inp = document.createElement("input");
                  inp.type = "file";
                  inp.accept = "image/*";
                  inp.onchange = () => inp.files?.[0] && handleUpload(inp.files[0]);
                  inp.click();
                }}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="" className="h-16 w-16 rounded object-cover border" />
            )}
          </div>
          <Button onClick={addFolder} className="w-full">
            <FolderPlus className="h-4 w-4 mr-2" /> Add Folder
          </Button>
        </Card>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Existing folders ({folders.length})
          </Label>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No folders yet.</p>
          ) : (
            <div className="space-y-2">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-2 border rounded-md"
                >
                  {f.images ? (
                    <img src={f.images} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 font-medium">{f.folder_name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFolder(f.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
