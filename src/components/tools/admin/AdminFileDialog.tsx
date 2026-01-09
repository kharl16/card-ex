import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface FileItem {
  id?: number;
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

interface AdminFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FileItem | null;
  onSaved: () => void;
}

const emptyItem: FileItem = {
  file_name: "",
  description: null,
  images: null,
  folder_name: null,
  drive_link_download: null,
  drive_link_share: null,
  view_video_url: null,
  price_dp: null,
  price_srp: null,
  is_active: true,
};

export default function AdminFileDialog({ open, onOpenChange, item, onSaved }: AdminFileDialogProps) {
  const [formData, setFormData] = useState<FileItem>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(item || emptyItem);
    }
  }, [open, item]);

  const handleChange = (field: keyof FileItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (url: string | null) => {
    // Store the URL directly as the images field (comma-separated for multiple)
    setFormData((prev) => ({ ...prev, images: url }));
  };

  const handleSave = async () => {
    if (!formData.file_name.trim()) {
      toast.error("File name is required");
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        const { error } = await supabase
          .from("files_repository")
          .update({
            file_name: formData.file_name,
            description: formData.description,
            images: formData.images,
            folder_name: formData.folder_name,
            drive_link_download: formData.drive_link_download,
            drive_link_share: formData.drive_link_share,
            view_video_url: formData.view_video_url,
            price_dp: formData.price_dp,
            price_srp: formData.price_srp,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("File updated successfully");
      } else {
        const { error } = await supabase.from("files_repository").insert({
          file_name: formData.file_name,
          description: formData.description,
          images: formData.images,
          folder_name: formData.folder_name,
          drive_link_download: formData.drive_link_download,
          drive_link_share: formData.drive_link_share,
          view_video_url: formData.view_video_url,
          price_dp: formData.price_dp,
          price_srp: formData.price_srp,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast.success("File created successfully");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("files_repository")
        .delete()
        .eq("id", formData.id);

      if (error) throw error;

      toast.success("File deleted");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit File" : "Add File"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>File Name *</Label>
            <Input
              value={formData.file_name}
              onChange={(e) => handleChange("file_name", e.target.value)}
              placeholder="Product or file name"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value || null)}
              placeholder="Brief description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Folder Name</Label>
            <Input
              value={formData.folder_name || ""}
              onChange={(e) => handleChange("folder_name", e.target.value || null)}
              placeholder="Category folder"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>DP Price</Label>
              <Input
                value={formData.price_dp || ""}
                onChange={(e) => handleChange("price_dp", e.target.value || null)}
                placeholder="₱0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>SRP Price</Label>
              <Input
                value={formData.price_srp || ""}
                onChange={(e) => handleChange("price_srp", e.target.value || null)}
                placeholder="₱0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Download Link</Label>
            <Input
              value={formData.drive_link_download || ""}
              onChange={(e) => handleChange("drive_link_download", e.target.value || null)}
              placeholder="Google Drive download link"
            />
          </div>

          <div className="space-y-2">
            <Label>Share Link</Label>
            <Input
              value={formData.drive_link_share || ""}
              onChange={(e) => handleChange("drive_link_share", e.target.value || null)}
              placeholder="Google Drive share link"
            />
          </div>

          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={formData.view_video_url || ""}
              onChange={(e) => handleChange("view_video_url", e.target.value || null)}
              placeholder="Product video URL"
            />
          </div>

          <ImageUpload
            value={formData.images}
            onChange={handleImageChange}
            label="Image"
            aspectRatio="aspect-square"
            bucket="media"
            folderPrefix="files-repository"
            maxSize={2}
          />

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label>Active</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange("is_active", checked)}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {item && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="mr-auto"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
