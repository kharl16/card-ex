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

interface AmbassadorClip {
  id?: string;
  endorser: string | null;
  product_endorsed: string | null;
  thumbnail: string | null;
  video_file_url: string | null;
  drive_link: string | null;
  drive_share_link: string | null;
  folder_name: string | null;
  is_active: boolean;
}

interface AdminAmbassadorClipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AmbassadorClip | null;
  defaultFolderName?: string;
  onSaved: () => void;
}

const emptyItem: AmbassadorClip = {
  endorser: null,
  product_endorsed: null,
  thumbnail: null,
  video_file_url: null,
  drive_link: null,
  drive_share_link: null,
  folder_name: null,
  is_active: true,
};

export default function AdminAmbassadorClipDialog({
  open,
  onOpenChange,
  item,
  defaultFolderName,
  onSaved,
}: AdminAmbassadorClipDialogProps) {
  const [formData, setFormData] = useState<AmbassadorClip>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(item || { ...emptyItem, folder_name: defaultFolderName || null });
    }
  }, [open, item, defaultFolderName]);

  const handleChange = (field: keyof AmbassadorClip, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.endorser?.trim() && !formData.product_endorsed?.trim()) {
      toast.error("Endorser or Product is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        endorser: formData.endorser,
        product_endorsed: formData.product_endorsed,
        thumbnail: formData.thumbnail,
        video_file_url: formData.video_file_url,
        drive_link: formData.drive_link,
        drive_share_link: formData.drive_share_link,
        folder_name: formData.folder_name,
        is_active: formData.is_active,
      };

      if (formData.id) {
        const { error } = await supabase
          .from("ambassadors_library")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", formData.id);
        if (error) throw error;
        toast.success("Clip updated successfully");
      } else {
        const { error } = await supabase.from("ambassadors_library").insert(payload);
        if (error) throw error;
        toast.success("Clip created successfully");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save clip");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("ambassadors_library")
        .delete()
        .eq("id", formData.id);
      if (error) throw error;
      toast.success("Clip deleted");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete clip");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Ambassador Clip" : "Add Ambassador Clip"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Endorser</Label>
            <Input
              value={formData.endorser || ""}
              onChange={(e) => handleChange("endorser", e.target.value || null)}
              placeholder="Ambassador name"
            />
          </div>

          <div className="space-y-2">
            <Label>Product Endorsed</Label>
            <Input
              value={formData.product_endorsed || ""}
              onChange={(e) => handleChange("product_endorsed", e.target.value || null)}
              placeholder="Product name"
            />
          </div>

          <div className="space-y-2">
            <Label>Video File URL</Label>
            <Input
              value={formData.video_file_url || ""}
              onChange={(e) => handleChange("video_file_url", e.target.value || null)}
              placeholder="Direct video URL"
            />
          </div>

          <div className="space-y-2">
            <Label>Drive Link</Label>
            <Input
              value={formData.drive_link || ""}
              onChange={(e) => handleChange("drive_link", e.target.value || null)}
              placeholder="Google Drive link"
            />
          </div>

          <div className="space-y-2">
            <Label>Drive Share Link</Label>
            <Input
              value={formData.drive_share_link || ""}
              onChange={(e) => handleChange("drive_share_link", e.target.value || null)}
              placeholder="Shareable Drive link"
            />
          </div>

          <div className="space-y-2">
            <Label>Folder Name</Label>
            <Input
              value={formData.folder_name || ""}
              onChange={(e) => handleChange("folder_name", e.target.value || null)}
              placeholder="e.g., Ambassador Clips"
            />
          </div>

          <ImageUpload
            value={formData.thumbnail}
            onChange={(url) => handleChange("thumbnail", url)}
            label="Thumbnail"
            aspectRatio="aspect-video"
            bucket="media"
            folderPrefix="ambassador-clips"
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
