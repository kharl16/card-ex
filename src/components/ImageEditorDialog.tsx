// ===============================
// ImageEditorDialog.tsx
// ===============================
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (blob: Blob) => void;
  /** Aspect ratio for crop area. Example: 1 for square, 16/9 for wide cover. */
  aspectRatio?: number;
}

function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.9,
      );
    };

    image.onerror = (err) => reject(err);
  });
}

export default function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  onSave,
  aspectRatio,
}: ImageEditorDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixelsParam: any) => {
    setCroppedAreaPixels(croppedAreaPixelsParam);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave(blob);
      onOpenChange(false);
    } catch (e) {
      console.error("Crop save error", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>
        <div className="relative h-[320px] w-full bg-black/80 rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio ?? 1} // 👈 key line: use provided aspect ratio
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
          />
        </div>
        <div className="mt-4 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Zoom</span>
          <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(val) => setZoom(val[0])} />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===============================
// ImageUpload.tsx
// ===============================
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, Crop, Maximize2, Minimize2, AlertTriangle } from "lucide-react";
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
  /** Optional: override Supabase bucket (default: "media") */
  bucket?: string;
  /** Optional: extra folder prefix inside bucket, ex: "avatars" */
  folderPrefix?: string;
}

export function ImageUpload({
  value,
  onChange,
  label,
  aspectRatio = "aspect-square",
  maxSize = 5,
  displayMode = "contain",
  onDisplayModeChange,
  showDisplayToggle = false,
  bucket = "media",
  folderPrefix,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔍 Detect cover / banner style fields from the label
  const lowerLabel = label.toLowerCase();
  const isCoverLike = lowerLabel.includes("cover") || lowerLabel.includes("banner") || lowerLabel.includes("header");

  // Use wide 16:9 aspect for covers, square (1) otherwise
  const editorAspectRatio = isCoverLike ? 16 / 9 : 1;

  // Validate image URL when value changes
  useEffect(() => {
    if (!value) {
      setImageError(false);
      return;
    }

    const img = new Image();
    img.onload = () => setImageError(false);
    img.onerror = () => {
      setImageError(true);
      toast.error(`Image not found. Please re-upload your ${label.toLowerCase()}.`);
    };
    img.src = value;
  }, [value, label]);

  const uploadBlob = async (blob: Blob) => {
    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to upload images.");
        return;
      }

      const timestamp = Date.now();
      const basePath = folderPrefix ? `${folderPrefix}/${user.id}` : `${user.id}`;
      const fileName = `${basePath}/${timestamp}.jpg`;

      const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path);

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

  const openEditorWithFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTempImageSrc(reader.result as string);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      openEditorWithFile(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      openEditorWithFile(file);
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
      const url = new URL(value);
      const parts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
      const path = parts[1];

      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }

      onChange(null);
      toast.success("Image removed");
    } catch (error) {
      console.error("Remove error:", error);
      onChange(null);
      toast.error("Failed to remove image from storage, but it was cleared locally.");
    }
  };

  const canToggleDisplayMode = showDisplayToggle && value && onDisplayModeChange && !imageError;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {canToggleDisplayMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDisplayModeChange!(displayMode === "contain" ? "cover" : "contain")}
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
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-busy={uploading}
      >
        {value ? (
          <div className="relative h-full w-full bg-muted/30">
            {imageError ? (
              <div
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-destructive/30 bg-destructive/10 p-4 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">Image not found</p>
                <p className="text-xs text-muted-foreground">Click to re-upload</p>
              </div>
            ) : (
              <img
                src={value}
                alt={label}
                className={`h-full w-full ${displayMode === "contain" ? "object-contain" : "object-cover"}`}
                onError={() => setImageError(true)}
              />
            )}

            <div className="absolute right-2 top-2 flex gap-1">
              {!imageError && (
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
              )}
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

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Uploading…</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
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
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (max {maxSize}MB)</p>
              </>
            )}
          </button>
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

      {tempImageSrc && (
        <ImageEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageSrc={tempImageSrc}
          onSave={handleEditorSave}
          aspectRatio={editorAspectRatio} // 👈 16:9 for cover/banner, 1:1 otherwise
        />
      )}
    </div>
  );
}

export default ImageUpload;
