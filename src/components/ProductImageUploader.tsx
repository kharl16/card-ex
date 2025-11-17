import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

interface ProductImageUploaderProps {
  cardId: string;
  ownerId: string;
  nextSortOrder: number;
  onUploadComplete: () => void;
}

export default function ProductImageUploader({
  cardId,
  ownerId,
  nextSortOrder,
  onUploadComplete,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${ownerId}/${cardId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('cardex-products')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cardex-products')
        .getPublicUrl(filePath);

      // Insert database record
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          card_id: cardId,
          image_url: urlData.publicUrl,
          alt_text: altText.trim() || null,
          sort_order: nextSortOrder,
          owner: ownerId,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        // Clean up uploaded file
        await supabase.storage.from('cardex-products').remove([filePath]);
        throw new Error('Failed to save image data');
      }

      toast.success('Product image uploaded successfully!');
      setSelectedFile(null);
      setAltText('');
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setAltText('');
  };

  return (
    <form onSubmit={handleUpload} className="mt-6 space-y-4 p-6 bg-card rounded-lg border border-border">
      <div className="space-y-2">
        <Label htmlFor="product-image" className="text-foreground font-medium">
          Add Product Image
        </Label>
        <div className="flex gap-3">
          <Input
            id="product-image"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            className="file:mr-3 file:px-4 file:py-2 file:rounded-md file:bg-[hsl(var(--gold))] file:text-[hsl(var(--primary-foreground))] file:font-medium file:border-0 file:cursor-pointer hover:file:bg-[hsl(var(--gold-hover))] disabled:opacity-50"
          />
          {selectedFile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={uploading}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="alt-text" className="text-foreground font-medium">
          Image Description (optional)
        </Label>
        <Input
          id="alt-text"
          type="text"
          placeholder="Describe the product image..."
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          disabled={uploading}
          maxLength={200}
        />
      </div>

      <Button
        type="submit"
        disabled={!selectedFile || uploading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading...' : 'Upload Product Image'}
      </Button>
    </form>
  );
}
