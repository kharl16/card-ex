import React, { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, X, GripVertical, Trash2 } from "lucide-react";
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
}

function SortableImageItem({ image, index, onDelete }: SortableImageItemProps) {
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed for this carousel`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length < files.length) {
      toast.warning(`Only uploading first ${filesToUpload.length} images (max ${maxImages})`);
    }

    setUploading(true);
    setUploadProgress(0);

    const newImages: CarouselImage[] = [];
    let completed = 0;

    for (const file of filesToUpload) {
      // Validate
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${ownerId}/${cardId}/${carouselKey}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("cardex-products")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("cardex-products")
          .getPublicUrl(filePath);

        newImages.push({
          url: urlData.publicUrl,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          order: images.length + newImages.length,
        });

        completed++;
        setUploadProgress(Math.round((completed / filesToUpload.length) * 100));
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages].map((img, i) => ({
        ...img,
        order: i,
      }));
      onImagesChange(updatedImages);
      toast.success(`Uploaded ${newImages.length} image${newImages.length > 1 ? "s" : ""}`);
    }

    setUploading(false);
    setUploadProgress(0);
    e.target.value = "";
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

  const carouselLabels: Record<CarouselKey, string> = {
    products: "Products",
    packages: "Packages",
    testimonies: "Testimonies",
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {images.length === 0 && (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            No images yet. Upload images to display in the {carouselLabels[carouselKey].toLowerCase()} carousel.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={uploading || images.length >= maxImages}
          multiple
          className="file:mr-4 file:px-3 file:py-1 file:rounded-md file:bg-primary file:text-primary-foreground file:font-medium file:border-0 file:cursor-pointer hover:file:opacity-90"
        />
        <p className="text-xs text-muted-foreground">
          Max 5MB per image. {maxImages - images.length} slots remaining.
        </p>
      </div>

      {uploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
        </div>
      )}
    </div>
  );
}
