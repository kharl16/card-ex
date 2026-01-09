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

interface PresentationItem {
  id?: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  presentation_url: string | null;
  download_url: string | null;
  category: string | null;
  is_active: boolean;
}

interface AdminPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PresentationItem | null;
  onSaved: () => void;
}

const emptyItem: PresentationItem = {
  title: "",
  description: null,
  thumbnail_url: null,
  presentation_url: null,
  download_url: null,
  category: null,
  is_active: true,
};

export default function AdminPresentationDialog({ open, onOpenChange, item, onSaved }: AdminPresentationDialogProps) {
  const [formData, setFormData] = useState<PresentationItem>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(item || emptyItem);
    }
  }, [open, item]);

  const handleChange = (field: keyof PresentationItem, value: any) => {
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
        const { error } = await supabase
          .from("presentations")
          .update({
            title: formData.title,
            description: formData.description,
            thumbnail_url: formData.thumbnail_url,
            presentation_url: formData.presentation_url,
            download_url: formData.download_url,
            category: formData.category,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("Presentation updated successfully");
      } else {
        const { error } = await supabase.from("presentations").insert({
          title: formData.title,
          description: formData.description,
          thumbnail_url: formData.thumbnail_url,
          presentation_url: formData.presentation_url,
          download_url: formData.download_url,
          category: formData.category,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast.success("Presentation created successfully");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save presentation");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("presentations")
        .delete()
        .eq("id", formData.id);

      if (error) throw error;

      toast.success("Presentation deleted");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete presentation");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Presentation" : "Add Presentation"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Presentation title"
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
              placeholder="e.g., Sales, Marketing"
            />
          </div>

          <div className="space-y-2">
            <Label>Presentation URL</Label>
            <Input
              value={formData.presentation_url || ""}
              onChange={(e) => handleChange("presentation_url", e.target.value || null)}
              placeholder="Google Slides, Canva, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Download URL</Label>
            <Input
              value={formData.download_url || ""}
              onChange={(e) => handleChange("download_url", e.target.value || null)}
              placeholder="Direct download link"
            />
          </div>

          <ImageUpload
            value={formData.thumbnail_url}
            onChange={(url) => handleChange("thumbnail_url", url)}
            label="Thumbnail"
            aspectRatio="aspect-[4/3]"
            bucket="media"
            folderPrefix="presentations"
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
