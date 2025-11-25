import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, GripVertical } from 'lucide-react';
import ProductImageUploader from './ProductImageUploader';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  description?: string | null;
  sort_order: number;
}

interface ProductImageManagerProps {
  cardId: string;
  ownerId: string;
  onImagesChange?: () => void;
}

interface SortableImageProps {
  image: ProductImage;
  onDelete: (id: string, url: string) => void;
  isDeleting: boolean;
}

function SortableImage({ image, onDelete, isDeleting }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg border border-border overflow-hidden bg-card"
    >
      <div className="aspect-video relative">
        <img
          src={image.image_url}
          alt={image.alt_text || 'Product image'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(image.id, image.image_url)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {image.alt_text || 'No description'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductImageManager({ cardId, ownerId, onImagesChange }: ProductImageManagerProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, image_url, alt_text, description, sort_order')
        .eq('card_id', cardId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading product images:', error);
      toast.error('Failed to load product images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [cardId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);

      const newImages = arrayMove(images, oldIndex, newIndex);
      setImages(newImages);

      // Update sort_order in database
      try {
        const updates = newImages.map((img, index) => ({
          id: img.id,
          sort_order: index,
        }));

        for (const update of updates) {
          await supabase
            .from('product_images')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        }

        onImagesChange?.();
      } catch (error) {
        console.error('Error updating sort order:', error);
        toast.error('Failed to update image order');
        loadImages(); // Reload to restore original order
      }
    }
  };

  const handleDelete = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this product image?')) {
      return;
    }

    setDeleting(imageId);

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'cardex-products');
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        
        // Delete from storage
        await supabase.storage.from('cardex-products').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Product image deleted successfully');
      await loadImages();
      onImagesChange?.();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete product image');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading product images...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Product Images ({images.length})</h3>
        <p className="text-sm text-muted-foreground">
          Manage product images that will be displayed in the carousel. Drag to reorder.
        </p>
      </div>

      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <SortableImage
                  key={image.id}
                  image={image}
                  onDelete={handleDelete}
                  isDeleting={deleting === image.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No product images yet. Add your first image below.</p>
        </div>
      )}

      <ProductImageUploader
        cardId={cardId}
        ownerId={ownerId}
        nextSortOrder={images.length}
        onUploadComplete={() => {
          loadImages();
          onImagesChange?.();
        }}
      />
    </div>
  );
}
