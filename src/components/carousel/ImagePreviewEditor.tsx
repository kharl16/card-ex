import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Check, X, RotateCcw } from "lucide-react";
import { compressImage, formatFileSize } from "@/lib/imageCompression";

interface PendingImage {
  file: File;
  previewUrl: string;
}

interface ImagePreviewEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingImages: PendingImage[];
  onConfirm: (processedBlobs: { blob: Blob; fileName: string }[]) => void;
}

/**
 * Crop and return a blob from the given image source
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  quality: number = 0.85
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

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
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob as Blob), "image/jpeg", quality);
  });
}

export default function ImagePreviewEditor({
  open,
  onOpenChange,
  pendingImages,
  onConfirm,
}: ImagePreviewEditorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [processedImages, setProcessedImages] = useState<Map<number, { blob: Blob; fileName: string }>>(new Map());
  const [processing, setProcessing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);

  const currentImage = pendingImages[currentIndex];
  const isLastImage = currentIndex === pendingImages.length - 1;
  const allProcessed = processedImages.size === pendingImages.length;

  const resetCropState = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCompressionInfo(null);
  }, []);

  const onCropComplete = useCallback((_: unknown, croppedAreaPixelsLocal: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(croppedAreaPixelsLocal);
  }, []);

  const handleProcessCurrent = async () => {
    if (!currentImage || !croppedAreaPixels) return;

    setProcessing(true);
    try {
      // Crop the image
      const croppedBlob = await getCroppedImg(currentImage.previewUrl, croppedAreaPixels);
      
      // Compress the cropped image
      const croppedFile = new File([croppedBlob], currentImage.file.name, { type: "image/jpeg" });
      const { blob: compressedBlob, originalSize, compressedSize } = await compressImage(croppedFile, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      setCompressionInfo({ original: originalSize, compressed: compressedSize });

      // Store processed image
      const newProcessed = new Map(processedImages);
      newProcessed.set(currentIndex, {
        blob: compressedBlob,
        fileName: currentImage.file.name.replace(/\.[^/.]+$/, ".jpg"),
      });
      setProcessedImages(newProcessed);

      // Move to next image or finish
      if (!isLastImage) {
        setCurrentIndex(currentIndex + 1);
        resetCropState();
      }
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkipCurrent = async () => {
    if (!currentImage) return;

    setProcessing(true);
    try {
      // Just compress without cropping
      const { blob: compressedBlob, originalSize, compressedSize } = await compressImage(currentImage.file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      setCompressionInfo({ original: originalSize, compressed: compressedSize });

      const newProcessed = new Map(processedImages);
      newProcessed.set(currentIndex, {
        blob: compressedBlob,
        fileName: currentImage.file.name,
      });
      setProcessedImages(newProcessed);

      if (!isLastImage) {
        setCurrentIndex(currentIndex + 1);
        resetCropState();
      }
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmAll = () => {
    const results = Array.from(processedImages.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, data]) => data);
    onConfirm(results);
    handleClose();
  };

  const handleClose = () => {
    setCurrentIndex(0);
    setProcessedImages(new Map());
    resetCropState();
    onOpenChange(false);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
    resetCropState();
  };

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit & Compress Images ({currentIndex + 1}/{pendingImages.length})</span>
            {compressionInfo && (
              <span className="text-sm font-normal text-muted-foreground">
                {formatFileSize(compressionInfo.original)} → {formatFileSize(compressionInfo.compressed)}
                {compressionInfo.compressed < compressionInfo.original && (
                  <span className="text-green-500 ml-1">
                    (-{Math.round((1 - compressionInfo.compressed / compressionInfo.original) * 100)}%)
                  </span>
                )}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Image thumbnails */}
        {pendingImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pendingImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => goToImage(idx)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                  idx === currentIndex
                    ? "border-primary"
                    : processedImages.has(idx)
                    ? "border-green-500"
                    : "border-border"
                }`}
              >
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                {processedImages.has(idx) && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Cropper */}
        <div className="relative flex-1 min-h-[50vh] bg-black rounded-lg overflow-hidden">
          <Cropper
            image={currentImage.previewUrl}
            crop={crop}
            zoom={zoom}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
            restrictPosition={false}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-12">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(values) => setZoom(values[0])}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={resetCropState}
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={handleClose} disabled={processing}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleSkipCurrent}
                disabled={processing || processedImages.has(currentIndex)}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Skip Crop
              </Button>

              <Button
                onClick={handleProcessCurrent}
                disabled={processing || !croppedAreaPixels || processedImages.has(currentIndex)}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isLastImage && !processedImages.has(currentIndex) ? "Crop & Finish" : "Crop & Next"}
              </Button>

              {allProcessed && (
                <Button onClick={handleConfirmAll} className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-2" />
                  Upload All ({processedImages.size})
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
