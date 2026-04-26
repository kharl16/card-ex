import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ResourceFolder, VisibilityLevel } from "@/types/resources";

export type EditorModule = "files" | "ambassadors" | "links" | "directory";

interface CustomField {
  label: string;
  value: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: EditorModule;
  initial?: Record<string, any> | null;
  folders?: ResourceFolder[];
  onSaved?: () => void;
}

const visibilityOptions: { value: VisibilityLevel; label: string }[] = [
  { value: "public_members", label: "All Members" },
  { value: "leaders_only", label: "Leaders Only" },
  { value: "admins_only", label: "Admins Only" },
  { value: "super_admin_only", label: "Super Admin Only" },
];

const tableFor: Record<EditorModule, string> = {
  files: "files_repository",
  ambassadors: "ambassadors_library",
  links: "iam_links",
  directory: "directory_entries",
};

export function ResourceItemEditor({
  open,
  onOpenChange,
  module,
  initial,
  folders = [],
  onSaved,
}: Props) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = initial ?? {
      visibility_level: "public_members",
      is_active: true,
    };
    setForm(base);
    const cf = Array.isArray(base.custom_fields) ? base.custom_fields : [];
    setCustomFields(cf);
  }, [open, initial]);

  const update = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const handleFileUpload = async (file: File, targetKey: string) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${module}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("resources").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("resources").getPublicUrl(path);
      update(targetKey, pub.publicUrl);
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = (targetKey: string, accept = "*/*") => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = accept;
    inp.onchange = () => inp.files?.[0] && handleFileUpload(inp.files[0], targetKey);
    inp.click();
  };

  const addCustomRow = () => setCustomFields((p) => [...p, { label: "", value: "" }]);
  const updateCustomRow = (i: number, key: "label" | "value", val: string) => {
    setCustomFields((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  };
  const removeCustomRow = (i: number) =>
    setCustomFields((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        ...form,
        custom_fields: customFields.filter((r) => r.label.trim() || r.value.trim()),
      };

      // Module-specific required field validation
      if (module === "files" && !payload.file_name?.trim()) {
        toast.error("File name is required");
        setSaving(false);
        return;
      }
      if (module === "ambassadors" && !payload.endorser?.trim()) {
        toast.error("Endorser is required");
        setSaving(false);
        return;
      }
      if (module === "links" && (!payload.name?.trim() || !payload.link?.trim())) {
        toast.error("Name and link are required");
        setSaving(false);
        return;
      }
      if (module === "directory" && !payload.location?.trim()) {
        toast.error("Location is required");
        setSaving(false);
        return;
      }

      const table = tableFor[module];
      let res;
      if (initial?.id != null) {
        res = await supabase.from(table as any).update(payload).eq("id", initial.id);
      } else {
        // Strip id for inserts so DB default applies (esp. for serial files_repository.id)
        const { id, created_at, updated_at, ...insertable } = payload;
        res = await supabase.from(table as any).insert(insertable);
      }
      if (res.error) throw res.error;
      toast.success(initial?.id ? "Updated" : "Created");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit" : "Add"} {module.slice(0, -1)}
          </DialogTitle>
          <DialogDescription>
            Fill in the standard fields, then add any extra rows you need.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* === FILES === */}
          {module === "files" && (
            <>
              <Field label="File name *">
                <Input
                  value={form.file_name ?? ""}
                  onChange={(e) => update("file_name", e.target.value)}
                />
              </Field>
              <Field label="Folder">
                <Select
                  value={form.folder_name ?? ""}
                  onValueChange={(v) => update("folder_name", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.folder_name}>
                        {f.folder_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Caption">
                <Input
                  value={form.caption ?? ""}
                  onChange={(e) => update("caption", e.target.value)}
                  placeholder="Short caption shown under the file"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={form.description ?? ""}
                  onChange={(e) => update("description", e.target.value)}
                  rows={3}
                />
              </Field>
              <UploadOrLink
                label="File / Download URL"
                value={form.drive_link_download ?? ""}
                onChange={(v) => update("drive_link_download", v)}
                onUpload={() => triggerUpload("drive_link_download")}
                uploading={uploading}
              />
              <UploadOrLink
                label="Thumbnail image"
                value={form.images ?? ""}
                onChange={(v) => update("images", v)}
                onUpload={() => triggerUpload("images", "image/*")}
                uploading={uploading}
                preview
              />
              <Field label="Share link">
                <Input
                  value={form.drive_link_share ?? ""}
                  onChange={(e) => update("drive_link_share", e.target.value)}
                />
              </Field>
              <Field label="Video URL">
                <Input
                  value={form.view_video_url ?? ""}
                  onChange={(e) => update("view_video_url", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (DP)">
                  <Input
                    value={form.price_dp ?? ""}
                    onChange={(e) => update("price_dp", e.target.value)}
                  />
                </Field>
                <Field label="Price (SRP)">
                  <Input
                    value={form.price_srp ?? ""}
                    onChange={(e) => update("price_srp", e.target.value)}
                  />
                </Field>
                <Field label="Unilevel Points">
                  <Input
                    type="number"
                    value={form.unilevel_points ?? ""}
                    onChange={(e) =>
                      update("unilevel_points", e.target.value ? parseFloat(e.target.value) : null)
                    }
                  />
                </Field>
                <Field label="Package Points (SMC)">
                  <Input
                    value={form.package_points_smc ?? ""}
                    onChange={(e) => update("package_points_smc", e.target.value)}
                  />
                </Field>
                <Field label="RQV">
                  <Input value={form.rqv ?? ""} onChange={(e) => update("rqv", e.target.value)} />
                </Field>
                <Field label="Infinity">
                  <Input
                    value={form.infinity ?? ""}
                    onChange={(e) => update("infinity", e.target.value)}
                  />
                </Field>
                <Field label="Check Match">
                  <Input
                    value={form.check_match ?? ""}
                    onChange={(e) => update("check_match", e.target.value)}
                  />
                </Field>
                <Field label="Give Me 5">
                  <Input
                    value={form.give_me_5 ?? ""}
                    onChange={(e) => update("give_me_5", e.target.value)}
                  />
                </Field>
                <Field label="Just 4 You">
                  <Input
                    value={form.just_4_you ?? ""}
                    onChange={(e) => update("just_4_you", e.target.value)}
                  />
                </Field>
                <Field label="Wholesale Commission">
                  <Input
                    value={form.wholesale_package_commission ?? ""}
                    onChange={(e) =>
                      update("wholesale_package_commission", e.target.value)
                    }
                  />
                </Field>
              </div>
            </>
          )}

          {/* === AMBASSADORS === */}
          {module === "ambassadors" && (
            <>
              <Field label="Endorser *">
                <Input
                  value={form.endorser ?? ""}
                  onChange={(e) => update("endorser", e.target.value)}
                />
              </Field>
              <Field label="Product endorsed">
                <Input
                  value={form.product_endorsed ?? ""}
                  onChange={(e) => update("product_endorsed", e.target.value)}
                />
              </Field>
              <Field label="Caption">
                <Input
                  value={form.caption ?? ""}
                  onChange={(e) => update("caption", e.target.value)}
                />
              </Field>
              <Field label="Folder">
                <Input
                  value={form.folder_name ?? ""}
                  onChange={(e) => update("folder_name", e.target.value)}
                />
              </Field>
              <UploadOrLink
                label="Thumbnail"
                value={form.thumbnail ?? ""}
                onChange={(v) => update("thumbnail", v)}
                onUpload={() => triggerUpload("thumbnail", "image/*")}
                uploading={uploading}
                preview
              />
              <UploadOrLink
                label="Video file URL"
                value={form.video_file_url ?? ""}
                onChange={(v) => update("video_file_url", v)}
                onUpload={() => triggerUpload("video_file_url", "video/*")}
                uploading={uploading}
              />
              <Field label="Drive link">
                <Input
                  value={form.drive_link ?? ""}
                  onChange={(e) => update("drive_link", e.target.value)}
                />
              </Field>
              <Field label="Drive share link">
                <Input
                  value={form.drive_share_link ?? ""}
                  onChange={(e) => update("drive_share_link", e.target.value)}
                />
              </Field>
            </>
          )}

          {/* === LINKS === */}
          {module === "links" && (
            <>
              <Field label="Name *">
                <Input
                  value={form.name ?? ""}
                  onChange={(e) => update("name", e.target.value)}
                />
              </Field>
              <Field label="Link *">
                <Input
                  value={form.link ?? ""}
                  onChange={(e) => update("link", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Caption">
                <Input
                  value={form.caption ?? ""}
                  onChange={(e) => update("caption", e.target.value)}
                />
              </Field>
              <Field label="Category">
                <Input
                  value={form.category ?? ""}
                  onChange={(e) => update("category", e.target.value)}
                />
              </Field>
              <UploadOrLink
                label="Icon"
                value={form.icon_url ?? ""}
                onChange={(v) => update("icon_url", v)}
                onUpload={() => triggerUpload("icon_url", "image/*")}
                uploading={uploading}
                preview
              />
            </>
          )}

          {/* === DIRECTORY === */}
          {module === "directory" && (
            <>
              <Field label="Location *">
                <Input
                  value={form.location ?? ""}
                  onChange={(e) => update("location", e.target.value)}
                />
              </Field>
              <Field label="Owner">
                <Input
                  value={form.owner ?? ""}
                  onChange={(e) => update("owner", e.target.value)}
                />
              </Field>
              <Field label="Caption">
                <Input
                  value={form.caption ?? ""}
                  onChange={(e) => update("caption", e.target.value)}
                />
              </Field>
              <Field label="Address">
                <Textarea
                  value={form.address ?? ""}
                  onChange={(e) => update("address", e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Maps link">
                <Input
                  value={form.maps_link ?? ""}
                  onChange={(e) => update("maps_link", e.target.value)}
                />
              </Field>
              <Field label="Operating hours">
                <Input
                  value={form.operating_hours ?? ""}
                  onChange={(e) => update("operating_hours", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Phone 1">
                  <Input
                    value={form.phone_1 ?? ""}
                    onChange={(e) => update("phone_1", e.target.value)}
                  />
                </Field>
                <Field label="Phone 2">
                  <Input
                    value={form.phone_2 ?? ""}
                    onChange={(e) => update("phone_2", e.target.value)}
                  />
                </Field>
                <Field label="Phone 3">
                  <Input
                    value={form.phone_3 ?? ""}
                    onChange={(e) => update("phone_3", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Facebook page">
                <Input
                  value={form.facebook_page ?? ""}
                  onChange={(e) => update("facebook_page", e.target.value)}
                />
              </Field>
              <UploadOrLink
                label="Owner photo"
                value={form.owner_photo_url ?? ""}
                onChange={(v) => update("owner_photo_url", v)}
                onUpload={() => triggerUpload("owner_photo_url", "image/*")}
                uploading={uploading}
                preview
              />
              <UploadOrLink
                label="Location image"
                value={form.location_image_url ?? ""}
                onChange={(v) => update("location_image_url", v)}
                onUpload={() => triggerUpload("location_image_url", "image/*")}
                uploading={uploading}
                preview
              />
            </>
          )}

          {/* === Visibility === */}
          <Field label="Visibility">
            <Select
              value={form.visibility_level ?? "public_members"}
              onValueChange={(v) => update("visibility_level", v as VisibilityLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* === Custom fields === */}
          <Card className="p-4 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Extra description rows</Label>
              <Button type="button" size="sm" variant="outline" onClick={addCustomRow}>
                <Plus className="h-3 w-3 mr-1" /> Add row
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add any additional label/value pairs (e.g. "Ingredients", "Net weight").
            </p>
            {customFields.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No extra rows.</p>
            ) : (
              customFields.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={row.label}
                    onChange={(e) => updateCustomRow(i, "label", e.target.value)}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => updateCustomRow(i, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCustomRow(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial?.id ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function UploadOrLink({
  label,
  value,
  onChange,
  onUpload,
  uploading,
  preview,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: () => void;
  uploading: boolean;
  preview?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste URL or upload file"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onUpload}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
      {preview && value && (
        <img
          src={value}
          alt=""
          className="h-20 w-20 rounded object-cover border"
          onError={(e) => ((e.currentTarget.style.display = "none"))}
        />
      )}
    </div>
  );
}
