import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, X, Edit } from 'lucide-react';
import ImageEditorDialog from './ImageEditorDialog';

interface ProductImageUploaderProps {
  cardId: string;
  ownerId: string;
  nextSortOrder: number;
  onUploadComplete: () => void;
}

interface PendingImage {
  file: File;
  preview: string;
  altText: string;
  description: string;
  editedBlob?: Blob;
}

export default function ProductImageUploader({
  cardId,
  ownerId,
  nextSortOrder,
  onUploadComplete,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: PendingImage[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        return;
      }

      const preview = URL.createObjectURL(file);
      newImages.push({
        file,
        preview,
        altText: '',
        description: '',
      });
    });

    setPendingImages((prev) => [...prev, ...newImages]);
    e.target.value = ''; // Reset input
  };

  const handleUpload = async () => {
    if (pendingImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let currentSort = nextSortOrder;

    try {
      for (let i = 0; i < pendingImages.length; i++) {
        const pending = pendingImages[i];
        setUploadProgress((prev) => ({ ...prev, [i]: 10 }));

        try {
          // Use edited blob if available, otherwise original file
          const fileToUpload = pending.editedBlob || pending.file;
          const fileExt = pending.file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${ownerId}/${cardId}/${fileName}`;

          setUploadProgress((prev) => ({ ...prev, [i]: 30 }));

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('cardex-products')
            .upload(filePath, fileToUpload, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload ${pending.file.name}`);
          }

          setUploadProgress((prev) => ({ ...prev, [i]: 60 }));

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('cardex-products')
            .getPublicUrl(filePath);

          setUploadProgress((prev) => ({ ...prev, [i]: 80 }));

          // Insert database record
          const { error: dbError } = await supabase
            .from('product_images')
            .insert({
              card_id: cardId,
              image_url: urlData.publicUrl,
              alt_text: pending.altText.trim() || null,
              description: pending.description.trim() || null,
              sort_order: currentSort++,
              owner: ownerId,
            });

          if (dbError) {
            console.error('Database error:', dbError);
            // Clean up uploaded file
            await supabase.storage.from('cardex-products').remove([filePath]);
            throw new Error(`Failed to save ${pending.file.name}`);
          }

          setUploadProgress((prev) => ({ ...prev, [i]: 100 }));
          successCount++;
        } catch (error) {
          console.error(`Error uploading ${pending.file.name}:`, error);
          toast.error(error instanceof Error ? error.message : `Failed to upload ${pending.file.name}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} image${successCount > 1 ? 's' : ''}!`);
        // Clean up previews
        pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setPendingImages([]);
        setUploadProgress({});
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const image = pendingImages[index];
    URL.revokeObjectURL(image.preview);
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  };

  const handleUpdateImageData = (index: number, field: 'altText' | 'description', value: string) => {
    setPendingImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, [field]: value } : img))
    );
  };

  const handleImageEdited = (blob: Blob) => {
    if (editingIndex !== null) {
      setPendingImages((prev) =>
        prev.map((img, i) => (i === editingIndex ? { ...img, editedBlob: blob } : img))
      );
      setEditingIndex(null);
    }
  };

  return (
    <>
      <div className="mt-6 space-y-4 p-6 bg-card rounded-lg border border-border">
        <div className="space-y-2">
          <Label htmlFor="product-images" className="text-foreground font-medium">
            Add Product Images (Bulk Upload)
          </Label>
          <Input
            id="product-images"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            multiple
            className="flex items-center file:mr-3 file:px-4 file:py-2 file:rounded-md file:bg-[hsl(var(--gold))] file:text-[hsl(var(--primary-foreground))] file:font-medium file:border-0 file:cursor-pointer hover:file:bg-[hsl(var(--gold-hover))] disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            Select multiple images to upload at once. Max 5MB per image.
          </p>
        </div>

        {pendingImages.length > 0 && (
          <div className="space-y-4 mt-4">
            <h4 className="font-medium text-sm">Selected Images ({pendingImages.length})</h4>
            <div className="space-y-3">
              {pendingImages.map((image, index) => (
                <div
                  key={index}
                  className="p-4 border border-border rounded-lg space-y-3 bg-background"
                >
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={image.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      {image.editedBlob && (
                        <div className="absolute top-1 right-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded">
                          Edited
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium truncate">{image.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(image.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingIndex(index)}
                            disabled={uploading}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveImage(index)}
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        placeholder="Alt text (optional)"
                        value={image.altText}
                        onChange={(e) => handleUpdateImageData(index, 'altText', e.target.value)}
                        disabled={uploading}
                        maxLength={200}
                        className="text-sm"
                      />
                      <Textarea
                        placeholder="Caption/description (optional, shows on hover)"
                        value={image.description}
                        onChange={(e) => handleUpdateImageData(index, 'description', e.target.value)}
                        disabled={uploading}
                        maxLength={300}
                        rows={2}
                        className="text-sm"
                      />
                      {uploadProgress[index] !== undefined && (
                        <div className="space-y-1">
                          <Progress value={uploadProgress[index]} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {uploadProgress[index]}% uploaded
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={pendingImages.length === 0 || uploading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading
            ? `Uploading ${pendingImages.length} image${pendingImages.length > 1 ? 's' : ''}...`
            : `Upload ${pendingImages.length} image${pendingImages.length > 1 ? 's' : ''}`}
        </Button>
      </div>

      {editingIndex !== null && (
        <ImageEditorDialog
          open={editingIndex !== null}
          onOpenChange={(open) => !open && setEditingIndex(null)}
          imageSrc={pendingImages[editingIndex].preview}
          onSave={handleImageEdited}
        />
      )}
    </>
  );
}
