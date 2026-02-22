import React, { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, X, GripVertical, Trash2, ImagePlus, Pencil } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CarouselKey, CarouselImage } from "@/lib/carouselTypes";
import ImagePreviewEditor from "./ImagePreviewEditor";
import { createPreviewUrl, revokePreviewUrl, formatFileSize } from "@/lib/imageCompression";

interface CarouselImageUploaderProps {
  carouselKey: CarouselKey;
  cardId: string;
  ownerId: string;
  images: CarouselImage[];
  maxImages: number;
  onImagesChange: (images: CarouselImage[]) => void;
}

interface SortableImageItemProps {
  image: CarouselImage;
  index: number;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

function SortableImageItem({ image, index, onDelete, onEdit }: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `img-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg border border-border overflow-hidden bg-card"
    >
      <div className="aspect-video relative">
        <img
          src={image.url}
          alt={image.alt || "Carousel image"}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(index)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-2 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {image.alt || `Image ${index + 1}`}
        </span>
      </div>
    </div>
  );
}

// Edit dialog for image alt text and caption
interface ImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: CarouselImage | null;
  onSave: (alt: string, shareText: string) => void;
}

function ImageEditDialog({ open, onOpenChange, image, onSave }: ImageEditDialogProps) {
  const [alt, setAlt] = useState("");
  const [shareText, setShareText] = useState("");

  React.useEffect(() => {
    if (image) {
      setAlt(image.alt || "");
      setShareText(image.shareText || "");
    }
  }, [image]);

  const handleSave = () => {
    onSave(alt.trim(), shareText.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Image Details</DialogTitle>
        </DialogHeader>
        
        {image && (
          <div className="space-y-4">
            {/* Image preview */}
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={alt || "Preview"}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Alt text field */}
            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text / Title</Label>
              <Input
                id="alt-text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe this image..."
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Displayed as the image title and used for accessibility. {alt.length}/200
              </p>
            </div>

            {/* Caption/share text field */}
            <div className="space-y-2">
              <Label htmlFor="share-text">Caption (optional)</Label>
              <Textarea
                id="share-text"
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
                placeholder="Add a caption for sharing..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Shown on the share page below the image. {shareText.length}/500
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CarouselImageUploader({
  carouselKey,
  cardId,
  ownerId,
  images,
  maxImages,
  onImagesChange,
}: CarouselImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const validateFile = (file: File): boolean => {
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/bmp",
      "image/tiff",
      "image/heic",
      "image/heif",
    ];
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const validExtensions = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "tiff", "heic", "heif"];

    const isValidType = file.type.startsWith("image/") || validImageTypes.includes(file.type);
    const isValidExtension = validExtensions.includes(fileExtension);

    if (!isValidType && !isValidExtension) {
      toast.error(`${file.name} is not a supported image format`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} exceeds 10MB limit`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed for this carousel`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    if (filesToProcess.length < files.length) {
      toast.warning(`Only processing first ${filesToProcess.length} images (max ${maxImages})`);
    }

    // Validate files
    const validFiles = filesToProcess.filter(validateFile);
    if (validFiles.length === 0) return;

    // Create preview URLs
    const pending = validFiles.map((file) => ({
      file,
      previewUrl: createPreviewUrl(file),
    }));

    setPendingImages(pending);
    setShowEditor(true);
    e.target.value = "";
  };

  const handleEditorConfirm = async (processedBlobs: { blob: Blob; fileName: string }[]) => {
    // Clean up preview URLs
    pendingImages.forEach((img) => revokePreviewUrl(img.previewUrl));
    setPendingImages([]);

    if (processedBlobs.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const newImages: CarouselImage[] = [];
    let completed = 0;
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const { blob, fileName } of processedBlobs) {
      try {
        const fileExt = fileName.split(".").pop() || "jpg";
        const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${ownerId}/${cardId}/${carouselKey}/${uniqueFileName}`;

        totalOriginalSize += blob.size;
        totalCompressedSize += blob.size;

        const { error: uploadError } = await supabase.storage
          .from("cardex-products")
          .upload(filePath, blob, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("cardex-products")
          .getPublicUrl(filePath);

        newImages.push({
          url: urlData.publicUrl,
          alt: fileName.replace(/\.[^/.]+$/, ""),
          order: images.length + newImages.length,
        });

        completed++;
        setUploadProgress(Math.round((completed / processedBlobs.length) * 100));
      } catch (error) {
        console.error(`Error uploading ${fileName}:`, error);
        toast.error(`Failed to upload ${fileName}`);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages].map((img, i) => ({
        ...img,
        order: i,
      }));
      onImagesChange(updatedImages);
      toast.success(
        `Uploaded ${newImages.length} image${newImages.length > 1 ? "s" : ""} (${formatFileSize(totalCompressedSize)})`
      );
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleEditorClose = (open: boolean) => {
    if (!open) {
      // Clean up preview URLs
      pendingImages.forEach((img) => revokePreviewUrl(img.previewUrl));
      setPendingImages([]);
    }
    setShowEditor(open);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = parseInt(String(active.id).replace("img-", ""));
      const newIndex = parseInt(String(over.id).replace("img-", ""));

      const reordered = arrayMove(images, oldIndex, newIndex).map((img, i) => ({
        ...img,
        order: i,
      }));

      onImagesChange(reordered);
    },
    [images, onImagesChange]
  );

  const handleDelete = useCallback(
    async (index: number) => {
      const imageToDelete = images[index];

      // Try to delete from storage
      try {
        const urlParts = imageToDelete.url.split("/");
        const bucketIndex = urlParts.findIndex((part) => part === "cardex-products");
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join("/");
          await supabase.storage.from("cardex-products").remove([filePath]);
        }
      } catch (error) {
        console.error("Error deleting from storage:", error);
      }

      const updated = images.filter((_, i) => i !== index).map((img, i) => ({
        ...img,
        order: i,
      }));

      onImagesChange(updated);
      toast.success("Image removed");
    },
    [images, onImagesChange]
  );

  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setShowEditDialog(true);
  }, []);

  const handleEditSave = useCallback(
    (alt: string, shareText: string) => {
      if (editingIndex === null) return;
      
      const updated = images.map((img, i) =>
        i === editingIndex ? { ...img, alt, shareText } : img
      );
      onImagesChange(updated);
      setEditingIndex(null);
      toast.success("Image details updated");
    },
    [editingIndex, images, onImagesChange]
  );

  const carouselLabels: Record<CarouselKey, string> = {
    products: "Products",
    packages: "Packages",
    testimonies: "Testimonies",
    videos: "Videos",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {carouselLabels[carouselKey]} Images ({images.length}/{maxImages})
        </Label>
      </div>

      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((_, i) => `img-${i}`)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {images.map((image, index) => (
                <SortableImageItem
                  key={`img-${index}`}
                  image={image}
                  index={index}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {images.length === 0 && (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No images yet. Upload images to display in the {carouselLabels[carouselKey].toLowerCase()} carousel.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Input
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,.tiff,.heic,.heif"
          onChange={handleFileChange}
          disabled={uploading || images.length >= maxImages}
          multiple
          className="file:mr-4 file:px-3 file:py-1 file:rounded-md file:bg-primary file:text-primary-foreground file:font-medium file:border-0 file:cursor-pointer hover:file:opacity-90"
        />
        <p className="text-xs text-muted-foreground">
          Images are automatically compressed. Crop/edit before upload. Max 10MB per image. {maxImages - images.length} slots remaining.
        </p>
      </div>

      {uploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
        </div>
      )}

      <ImagePreviewEditor
        open={showEditor}
        onOpenChange={handleEditorClose}
        pendingImages={pendingImages}
        onConfirm={handleEditorConfirm}
      />

      <ImageEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        image={editingIndex !== null ? images[editingIndex] : null}
        onSave={handleEditSave}
      />
    </div>
  );
}
