import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface DetailRow {
  label: string;
  value: string;
}

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
  details_heading?: string | null;
  details_rows?: DetailRow[] | null;
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
  details_heading: null,
  details_rows: [],
};

export default function AdminFileDialog({ open, onOpenChange, item, onSaved }: AdminFileDialogProps) {
  const [formData, setFormData] = useState<FileItem>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkPaste, setBulkPaste] = useState("");

  useEffect(() => {
    if (open) {
      setFormData(
        item
          ? { ...item, details_rows: Array.isArray(item.details_rows) ? item.details_rows : [] }
          : emptyItem
      );
      setBulkPaste("");
    }
  }, [open, item]);

  const handleChange = (field: keyof FileItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (url: string | null) => {
    setFormData((prev) => ({ ...prev, images: url }));
  };

  const rows: DetailRow[] = formData.details_rows ?? [];

  const updateRow = (idx: number, patch: Partial<DetailRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    handleChange("details_rows", next);
  };
  const addRow = () => handleChange("details_rows", [...rows, { label: "", value: "" }]);
  const removeRow = (idx: number) =>
    handleChange("details_rows", rows.filter((_, i) => i !== idx));
  const moveRow = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    handleChange("details_rows", next);
  };

  const applyBulkPaste = () => {
    if (!bulkPaste.trim()) return;
    const parsed: DetailRow[] = bulkPaste
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Split on tab, then ":" or " - " or " — " or last whitespace before currency
        let parts = line.split(/\t/);
        if (parts.length < 2) parts = line.split(/\s*[:|\u2014\-]\s+/);
        if (parts.length < 2) {
          // Fallback: split at last whitespace
          const m = line.match(/^(.*\S)\s+(\S+)$/);
          if (m) parts = [m[1], m[2]];
        }
        return {
          label: (parts[0] || "").trim(),
          value: (parts.slice(1).join(" ") || "").trim(),
        };
      })
      .filter((r) => r.label || r.value);
    handleChange("details_rows", [...rows, ...parsed]);
    setBulkPaste("");
    toast.success(`Added ${parsed.length} row${parsed.length === 1 ? "" : "s"}`);
  };

  const handleSave = async () => {
    if (!formData.file_name.trim()) {
      toast.error("File name is required");
      return;
    }

    // Strip empty rows before save
    const cleanRows = rows.filter((r) => r.label.trim() || r.value.trim());

    setSaving(true);
    try {
      const payload: any = {
        "File Name": formData.file_name,
        "Description": formData.description,
        "Images": formData.images,
        "Folder Name": formData.folder_name,
        "Drive Link Download": formData.drive_link_download,
        "Drive Link share": formData.drive_link_share,
        "View Video URL": formData.view_video_url,
        "Price (DP)": formData.price_dp,
        "Price (SRP)": formData.price_srp,
        details_heading: formData.details_heading,
        details_rows: cleanRows,
      };

      if (formData.id) {
        const { error } = await supabase
          .from("IAM Files" as any)
          .update(payload)
          .eq("id", formData.id);
        if (error) throw error;
        toast.success("File updated successfully");
      } else {
        const { error } = await supabase.from("IAM Files" as any).insert(payload);
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
        .from("IAM Files" as any)
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

          {/* ── Package / Product Details ── */}
          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Package Details Table</Label>
              <span className="text-xs text-muted-foreground">{rows.length} row{rows.length === 1 ? "" : "s"}</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Heading (optional)</Label>
              <Input
                value={formData.details_heading || ""}
                onChange={(e) => handleChange("details_heading", e.target.value || null)}
                placeholder="e.g. The VIP package (Free additional products worth P50,000)"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Rows (Label · Value)</Label>
              {rows.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No rows yet. Add one below or paste in bulk.</p>
              )}
              {rows.map((row, idx) => (
                <div key={idx} className="flex gap-1 items-center">
                  <Input
                    value={row.label}
                    onChange={(e) => updateRow(idx, { label: e.target.value })}
                    placeholder="Label (e.g. Just 4 You)"
                    className="flex-1"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => updateRow(idx, { value: e.target.value })}
                    placeholder="Value (e.g. ₱200,000)"
                    className="flex-1"
                  />
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => moveRow(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeRow(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addRow}>
                <Plus className="w-4 h-4" /> Add Row
              </Button>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs">Bulk paste (one per line, separate with Tab, “:”, or “-”)</Label>
              <Textarea
                value={bulkPaste}
                onChange={(e) => setBulkPaste(e.target.value)}
                placeholder={"Just 4 You\t₱200,000\nGive Me 5\t₱15,000\nRQV - 4,000"}
                rows={4}
                className="font-mono text-xs"
              />
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={applyBulkPaste} disabled={!bulkPaste.trim()}>
                Append rows from paste
              </Button>
            </div>
          </div>

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
