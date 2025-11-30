import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ZoomIn, Sun, Contrast } from 'lucide-react';
import { toast } from 'sonner';

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (editedBlob: Blob) => void;
}

export default function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  onSave,
}: ImageEditorDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Enable CORS
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (): Promise<Blob> => {
    // For external URLs, we need to fetch the image as a blob first
    let imageUrl = imageSrc;
    
    // If it's an external URL (not base64), fetch it as blob to avoid CORS
    if (!imageSrc.startsWith('data:')) {
      try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Failed to fetch image:', error);
        throw new Error('Failed to load image for editing');
      }
    }

    const image = await createImage(imageUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx || !croppedAreaPixels) {
      throw new Error('Failed to get canvas context or crop area');
    }

    const { width, height, x, y } = croppedAreaPixels;

    // Account for rotation - calculate bounding box
    const rotRad = (rotation * Math.PI) / 180;
    const bBoxWidth = Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height);
    const bBoxHeight = Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height);

    canvas.width = width;
    canvas.height = height;

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Move to center, rotate, then draw
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotRad);
    ctx.translate(-width / 2, -height / 2);

    // Draw the cropped portion
    ctx.drawImage(
      image,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height
    );

    // Clean up blob URL if we created one
    if (!imageSrc.startsWith('data:') && imageUrl !== imageSrc) {
      URL.revokeObjectURL(imageUrl);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg();
      onSave(croppedBlob);
      onOpenChange(false);
      // Reset state for next use
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setBrightness(100);
      setContrast(100);
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error('Failed to save edited image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Generate filter style for preview
  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Crop Area with filter preview */}
          <div className="relative h-96 bg-muted rounded-lg overflow-hidden" style={filterStyle}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4" />
                Zoom: {zoom.toFixed(1)}x
              </Label>
              <Slider
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                Rotation: {rotation}°
              </Label>
              <Slider
                min={0}
                max={360}
                step={1}
                value={[rotation]}
                onValueChange={([value]) => setRotation(value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Brightness: {brightness}%
              </Label>
              <Slider
                min={50}
                max={150}
                step={1}
                value={[brightness]}
                onValueChange={([value]) => setBrightness(value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Contrast className="h-4 w-4" />
                Contrast: {contrast}%
              </Label>
              <Slider
                min={50}
                max={150}
                step={1}
                value={[contrast]}
                onValueChange={([value]) => setContrast(value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
