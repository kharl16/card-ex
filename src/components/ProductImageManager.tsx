import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, GripVertical } from 'lucide-react';
import ProductImageUploader from './ProductImageUploader';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
}

interface ProductImageManagerProps {
  cardId: string;
  ownerId: string;
}

export default function ProductImageManager({ cardId, ownerId }: ProductImageManagerProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, image_url, alt_text, sort_order')
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
          Manage product images that will be displayed in the 3D carousel on your card.
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
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
                    onClick={() => handleDelete(image.id, image.image_url)}
                    disabled={deleting === image.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deleting === image.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {image.alt_text || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Order: {image.sort_order}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
        onUploadComplete={loadImages}
      />
    </div>
  );
}
