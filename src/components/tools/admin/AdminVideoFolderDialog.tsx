import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface VideoFolder {
  id?: string;
  folder_name: string;
  images: string | null;
  is_active: boolean;
}

interface AdminVideoFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: VideoFolder | null;
  onSaved: () => void;
}

const emptyFolder: VideoFolder = {
  folder_name: "",
  images: null,
  is_active: true,
};

export default function AdminVideoFolderDialog({ open, onOpenChange, folder, onSaved }: AdminVideoFolderDialogProps) {
  const [formData, setFormData] = useState<VideoFolder>(emptyFolder);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(folder || emptyFolder);
    }
  }, [open, folder]);

  const handleSave = async () => {
    if (!formData.folder_name.trim()) {
      toast.error("Folder name is required");
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        const { error } = await supabase
          .from("training_folders")
          .update({
            folder_name: formData.folder_name,
            images: formData.images,
            is_active: formData.is_active,
          })
          .eq("id", formData.id);
        if (error) throw error;
        toast.success("Folder updated");
      } else {
        const { error } = await supabase.from("training_folders").insert({
          folder_name: formData.folder_name,
          images: formData.images,
          is_active: formData.is_active,
        });
        if (error) throw error;
        toast.success("Folder created");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save folder");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("training_folders").delete().eq("id", formData.id);
      if (error) throw error;
      toast.success("Folder deleted");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete folder");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{folder ? "Edit Folder" : "Add Folder"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Folder Name *</Label>
            <Input
              value={formData.folder_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, folder_name: e.target.value }))}
              placeholder="e.g., CEO's Corner"
            />
          </div>

          <ImageUpload
            value={formData.images}
            onChange={(url) => setFormData((prev) => ({ ...prev, images: url }))}
            label="Cover Image"
            aspectRatio="aspect-video"
            bucket="media"
            folderPrefix="video-folders"
            maxSize={2}
          />

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label>Active</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {folder && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || saving} className="mr-auto">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
