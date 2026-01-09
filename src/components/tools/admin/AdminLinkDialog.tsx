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

interface IAMLink {
  id?: string;
  name: string;
  link: string;
  category: string | null;
  icon_url: string | null;
  is_active: boolean;
}

interface AdminLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: IAMLink | null;
  onSaved: () => void;
}

const emptyItem: IAMLink = {
  name: "",
  link: "",
  category: null,
  icon_url: null,
  is_active: true,
};

export default function AdminLinkDialog({ open, onOpenChange, item, onSaved }: AdminLinkDialogProps) {
  const [formData, setFormData] = useState<IAMLink>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(item || emptyItem);
    }
  }, [open, item]);

  const handleChange = (field: keyof IAMLink, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.link.trim()) {
      toast.error("Link URL is required");
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        const { error } = await supabase
          .from("iam_links")
          .update({
            name: formData.name,
            link: formData.link,
            category: formData.category,
            icon_url: formData.icon_url,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("Link updated successfully");
      } else {
        const { error } = await supabase.from("iam_links").insert({
          name: formData.name,
          link: formData.link,
          category: formData.category,
          icon_url: formData.icon_url,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast.success("Link created successfully");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("iam_links")
        .delete()
        .eq("id", formData.id);

      if (error) throw error;

      toast.success("Link deleted");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete link");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Link" : "Add Link"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Link name"
            />
          </div>

          <div className="space-y-2">
            <Label>URL *</Label>
            <Input
              value={formData.link}
              onChange={(e) => handleChange("link", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={formData.category || ""}
              onChange={(e) => handleChange("category", e.target.value || null)}
              placeholder="e.g., Social, Resources"
            />
          </div>

          <ImageUpload
            value={formData.icon_url}
            onChange={(url) => handleChange("icon_url", url)}
            label="Icon"
            aspectRatio="aspect-square"
            bucket="media"
            folderPrefix="iam-links"
            maxSize={1}
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
