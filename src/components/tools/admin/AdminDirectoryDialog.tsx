import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Upload, X, User, MapPin } from "lucide-react";

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
  owner_photo_url: string | null;
  location_image_url: string | null;
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
  owner_photo_url: null,
  location_image_url: null,
};

export default function AdminDirectoryDialog({ open, onOpenChange, item, onSaved }: AdminDirectoryDialogProps) {
  const [formData, setFormData] = useState<DirectoryEntry>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [siteOptionsLoading, setSiteOptionsLoading] = useState(false);
  const [uploadingOwnerPhoto, setUploadingOwnerPhoto] = useState(false);
  const [uploadingLocationImage, setUploadingLocationImage] = useState(false);
  const ownerPhotoInputRef = useRef<HTMLInputElement>(null);
  const locationImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFormData(item || emptyItem);
    }
  }, [open, item]);

  useEffect(() => {
    if (!open) return;

    const fetchSiteOptions = async () => {
      setSiteOptionsLoading(true);
      try {
        // Fetch from the dedicated sites table for consistent options
        const { data, error } = await supabase
          .from("sites")
          .select("sites")
          .eq("is_active", true)
          .order("sites", { ascending: true });

        if (error) throw error;

        const values = (data || [])
          .map((row) => row.sites?.trim())
          .filter((s): s is string => !!s);

        // Ensure current value is in the list (for editing entries with legacy values)
        const current = (item?.sites ?? null)?.trim();
        if (current && !values.includes(current)) {
          values.unshift(current);
        }

        setSiteOptions(values);
      } catch (err: any) {
        console.error("Failed to fetch site options:", err);
        setSiteOptions([]);
      } finally {
        setSiteOptionsLoading(false);
      }
    };

    fetchSiteOptions();
  }, [open, item]);

  const handleChange = (field: keyof DirectoryEntry, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (
    file: File,
    type: "owner_photo" | "location_image"
  ) => {
    const setUploading = type === "owner_photo" ? setUploadingOwnerPhoto : setUploadingLocationImage;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const path = `directory/${type}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);

      const field = type === "owner_photo" ? "owner_photo_url" : "location_image_url";
      handleChange(field, urlData.publicUrl);
      toast.success(`${type === "owner_photo" ? "Owner photo" : "Location image"} uploaded`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
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
            owner_photo_url: formData.owner_photo_url,
            location_image_url: formData.location_image_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("Directory entry updated successfully");
      } else {
        // Insert new entry - let database auto-generate the ID
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
          owner_photo_url: formData.owner_photo_url,
          location_image_url: formData.location_image_url,
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
            <Select
              value={formData.sites ?? "__none__"}
              onValueChange={(value) => handleChange("sites", value === "__none__" ? null : value)}
              disabled={siteOptionsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={siteOptionsLoading ? "Loading..." : "Select a site/region"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {siteOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Image Upload Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Owner Photo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="w-4 h-4" /> Owner Photo
              </Label>
              <input
                ref={ownerPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "owner_photo");
                  e.target.value = "";
                }}
              />
              {formData.owner_photo_url ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={formData.owner_photo_url}
                    alt="Owner"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => handleChange("owner_photo_url", null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 flex flex-col gap-1"
                  onClick={() => ownerPhotoInputRef.current?.click()}
                  disabled={uploadingOwnerPhoto}
                >
                  {uploadingOwnerPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload Photo</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Location Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Location Image
              </Label>
              <input
                ref={locationImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "location_image");
                  e.target.value = "";
                }}
              />
              {formData.location_image_url ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={formData.location_image_url}
                    alt="Location"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => handleChange("location_image_url", null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 flex flex-col gap-1"
                  onClick={() => locationImageInputRef.current?.click()}
                  disabled={uploadingLocationImage}
                >
                  {uploadingLocationImage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload Image</span>
                    </>
                  )}
                </Button>
              )}
            </div>
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
