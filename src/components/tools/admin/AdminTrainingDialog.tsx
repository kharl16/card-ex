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

interface TrainingItem {
  id?: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  source_type: string | null;
  category: string | null;
  is_active: boolean;
}

interface AdminTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TrainingItem | null;
  defaultCategory?: string;
  onSaved: () => void;
}

const emptyItem: TrainingItem = {
  title: "",
  description: null,
  thumbnail_url: null,
  video_url: null,
  source_type: "youtube",
  category: null,
  is_active: true,
};

export default function AdminTrainingDialog({ open, onOpenChange, item, defaultCategory, onSaved }: AdminTrainingDialogProps) {
  const [formData, setFormData] = useState<TrainingItem>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(item || { ...emptyItem, category: defaultCategory || null });
    }
  }, [open, item, defaultCategory]);

  const handleChange = (field: keyof TrainingItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        // Update
        const { error } = await supabase
          .from("training_items")
          .update({
            title: formData.title,
            description: formData.description,
            thumbnail_url: formData.thumbnail_url,
            video_url: formData.video_url,
            source_type: formData.source_type,
            category: formData.category,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("Video updated successfully");
      } else {
        // Create
        const { error } = await supabase.from("training_items").insert({
          title: formData.title,
          description: formData.description,
          thumbnail_url: formData.thumbnail_url,
          video_url: formData.video_url,
          source_type: formData.source_type,
          category: formData.category,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast.success("Video created successfully");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("training_items")
        .delete()
        .eq("id", formData.id);

      if (error) throw error;

      toast.success("Video deleted");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete video");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Video" : "Add Video"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Video title"
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
            <Label>Category</Label>
            <Input
              value={formData.category || ""}
              onChange={(e) => handleChange("category", e.target.value || null)}
              placeholder="e.g., Getting Started, Advanced"
            />
          </div>

          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={formData.video_url || ""}
              onChange={(e) => handleChange("video_url", e.target.value || null)}
              placeholder="YouTube or other video URL"
            />
          </div>

          <div className="space-y-2">
            <Label>Source Type</Label>
            <Input
              value={formData.source_type || ""}
              onChange={(e) => handleChange("source_type", e.target.value || null)}
              placeholder="youtube, vimeo, etc."
            />
          </div>

          <ImageUpload
            value={formData.thumbnail_url}
            onChange={(url) => handleChange("thumbnail_url", url)}
            label="Thumbnail"
            aspectRatio="aspect-video"
            bucket="media"
            folderPrefix="trainings"
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
