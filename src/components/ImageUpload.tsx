import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, Crop, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImageEditorDialog from "./ImageEditorDialog";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  aspectRatio?: string;
  maxSize?: number; // in MB
  displayMode?: "contain" | "cover";
  onDisplayModeChange?: (mode: "contain" | "cover") => void;
  showDisplayToggle?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  aspectRatio = "aspect-square",
  maxSize = 5,
  displayMode = "contain",
  onDisplayModeChange,
  showDisplayToggle = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadBlob = async (blob: Blob) => {
    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to upload images");
        return;
      }

      // Generate unique filename
      const fileName = `${user.id}/${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("media")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(data.path);

      onChange(publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
      setTempImageSrc(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`File size must be less than ${maxSize}MB`);
        return;
      }

      // Open editor with the selected image
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setEditorOpen(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`File size must be less than ${maxSize}MB`);
        return;
      }

      // Open editor with the dropped image
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setEditorOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditorSave = (blob: Blob) => {
    uploadBlob(blob);
  };

  const handleEditExisting = () => {
    if (value) {
      setTempImageSrc(value);
      setEditorOpen(true);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extract path from URL
      const url = new URL(value);
      const path = url.pathname.split("/storage/v1/object/public/media/")[1];

      if (path) {
        await supabase.storage.from("media").remove([path]);
      }

      onChange(null);
      toast.success("Image removed");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove image");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {showDisplayToggle && value && onDisplayModeChange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDisplayModeChange(displayMode === "contain" ? "cover" : "contain")}
            className="h-7 text-xs gap-1"
          >
            {displayMode === "contain" ? (
              <>
                <Maximize2 className="h-3 w-3" />
                Fit
              </>
            ) : (
              <>
                <Minimize2 className="h-3 w-3" />
                Fill
              </>
            )}
          </Button>
        )}
      </div>

      <div
        className={`relative ${aspectRatio} w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="relative h-full w-full bg-muted/30">
            <img
              src={value}
              alt={label}
              className={`h-full w-full ${displayMode === "contain" ? "object-contain" : "object-cover"}`}
            />
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={handleEditExisting}
                title="Crop & Adjust"
              >
                <Crop className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={handleRemove}
                title="Remove"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP (max {maxSize}MB)
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {/* Image Editor Dialog */}
      {tempImageSrc && (
        <ImageEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageSrc={tempImageSrc}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
}
