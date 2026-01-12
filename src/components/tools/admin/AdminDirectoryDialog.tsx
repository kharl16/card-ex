import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";

interface DirectoryEntry {
  id?: number;
  location: string | null;
  address: string | null;
  maps_link: string | null;
  owner: string | null;
  facebook_page: string | null;
  operating_hours: string | null;
  phone_1: string | null;
  phone_2: string | null;
  phone_3: string | null;
  sites: string | null;
  is_active: boolean;
}

interface AdminDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DirectoryEntry | null;
  onSaved: () => void;
}

const emptyItem: DirectoryEntry = {
  location: "",
  address: null,
  maps_link: null,
  owner: null,
  facebook_page: null,
  operating_hours: null,
  phone_1: null,
  phone_2: null,
  phone_3: null,
  sites: null,
  is_active: true,
};

export default function AdminDirectoryDialog({ open, onOpenChange, item, onSaved }: AdminDirectoryDialogProps) {
  const [formData, setFormData] = useState<DirectoryEntry>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(item || emptyItem);
    }
  }, [open, item]);

  const handleChange = (field: keyof DirectoryEntry, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.location?.trim()) {
      toast.error("Location is required");
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        const { error } = await supabase
          .from("directory_entries")
          .update({
            location: formData.location,
            address: formData.address,
            maps_link: formData.maps_link,
            owner: formData.owner,
            facebook_page: formData.facebook_page,
            operating_hours: formData.operating_hours,
            phone_1: formData.phone_1,
            phone_2: formData.phone_2,
            phone_3: formData.phone_3,
            sites: formData.sites,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("Directory entry updated successfully");
      } else {
        const { error } = await supabase.from("directory_entries").insert({
          location: formData.location,
          address: formData.address,
          maps_link: formData.maps_link,
          owner: formData.owner,
          facebook_page: formData.facebook_page,
          operating_hours: formData.operating_hours,
          phone_1: formData.phone_1,
          phone_2: formData.phone_2,
          phone_3: formData.phone_3,
          sites: formData.sites,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast.success("Directory entry created successfully");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save directory entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("directory_entries")
        .delete()
        .eq("id", formData.id);

      if (error) throw error;

      toast.success("Directory entry deleted");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete directory entry");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Directory Entry" : "Add Directory Entry"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Location *</Label>
            <Input
              value={formData.location || ""}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Branch location name"
            />
          </div>

          <div className="space-y-2">
            <Label>Site/Region</Label>
            <Input
              value={formData.sites || ""}
              onChange={(e) => handleChange("sites", e.target.value || null)}
              placeholder="e.g., Metro Manila, Visayas"
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.address || ""}
              onChange={(e) => handleChange("address", e.target.value || null)}
              placeholder="Full address"
            />
          </div>

          <div className="space-y-2">
            <Label>Owner</Label>
            <Input
              value={formData.owner || ""}
              onChange={(e) => handleChange("owner", e.target.value || null)}
              placeholder="Branch owner name"
            />
          </div>

          <div className="space-y-2">
            <Label>Operating Hours</Label>
            <Input
              value={formData.operating_hours || ""}
              onChange={(e) => handleChange("operating_hours", e.target.value || null)}
              placeholder="e.g., Mon-Sat 8AM-5PM"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Phone 1</Label>
              <Input
                value={formData.phone_1 || ""}
                onChange={(e) => handleChange("phone_1", e.target.value || null)}
                placeholder="Primary phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone 2</Label>
              <Input
                value={formData.phone_2 || ""}
                onChange={(e) => handleChange("phone_2", e.target.value || null)}
                placeholder="Secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone 3</Label>
              <Input
                value={formData.phone_3 || ""}
                onChange={(e) => handleChange("phone_3", e.target.value || null)}
                placeholder="Tertiary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Maps Link</Label>
            <Input
              value={formData.maps_link || ""}
              onChange={(e) => handleChange("maps_link", e.target.value || null)}
              placeholder="Google Maps URL"
            />
          </div>

          <div className="space-y-2">
            <Label>Facebook Page</Label>
            <Input
              value={formData.facebook_page || ""}
              onChange={(e) => handleChange("facebook_page", e.target.value || null)}
              placeholder="Facebook page URL"
            />
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
