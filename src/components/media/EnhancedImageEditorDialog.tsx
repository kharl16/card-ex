import React, { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw, RotateCw, RefreshCw, Sun, Contrast } from "lucide-react";
import { toast } from "sonner";

export type ImageType = "avatar" | "logo" | "cover";

interface EnhancedImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  imageType?: ImageType;
  onSave: (blob: Blob) => void;
}

// Get aspect ratio based on image type
function getAspectRatio(imageType: ImageType): number {
  switch (imageType) {
    case "avatar":
    case "logo":
      return 1; // 1:1 square
    case "cover":
      return 16 / 9;
    default:
      return 1;
  }
}

// Get output dimensions based on image type
function getOutputDimensions(imageType: ImageType): { width: number; height: number } {
  switch (imageType) {
    case "avatar":
    case "logo":
      return { width: 512, height: 512 };
    case "cover":
      return { width: 1280, height: 720 };
    default:
      return { width: 512, height: 512 };
  }
}

const EnhancedImageEditorDialog: React.FC<EnhancedImageEditorDialogProps> = ({
  open,
  onOpenChange,
  imageSrc,
  imageType = "avatar",
  onSave,
}) => {
  // State for editing controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const aspectRatio = getAspectRatio(imageType);

  // Reset all values when dialog opens with new image
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setBrightness(1);
      setContrast(1);
      setOffsetX(0);
      setOffsetY(0);
      setImageLoaded(false);
    }
  }, [open, imageSrc]);

  // Load image with proper CORS handling
  useEffect(() => {
    if (!open || !imageSrc) return;

    const img = new Image();
    // Set crossOrigin BEFORE setting src to ensure CORS headers are requested
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      imageRef.current = img;
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    
    img.onerror = () => {
      // Try loading without crossOrigin as fallback (for data URLs)
      if (imageSrc.startsWith('data:')) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          imageRef.current = fallbackImg;
          setNaturalSize({ width: fallbackImg.naturalWidth, height: fallbackImg.naturalHeight });
          setImageLoaded(true);
        };
        fallbackImg.onerror = () => {
          toast.error("Failed to load image for editing");
          setImageLoaded(false);
        };
        fallbackImg.src = imageSrc;
      } else {
        toast.error("Failed to load image for editing");
        setImageLoaded(false);
      }
    };
    
    // Add cache-busting for Supabase storage URLs to avoid CORS caching issues
    if (imageSrc.includes('supabase.co') && !imageSrc.includes('?')) {
      img.src = `${imageSrc}?t=${Date.now()}`;
    } else if (imageSrc.includes('supabase.co') && !imageSrc.includes('t=')) {
      img.src = `${imageSrc}&t=${Date.now()}`;
    } else {
      img.src = imageSrc;
    }
  }, [open, imageSrc]);

  // Apply brightness and contrast manually via pixel manipulation
  const applyBrightnessContrast = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    brightnessVal: number,
    contrastVal: number
  ) => {
    // Only apply if values are not default
    if (brightnessVal === 1 && contrastVal === 1) return;
    
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Convert brightness (1.0 = normal) to multiplier
      const brightnessFactor = brightnessVal;
      
      // Convert contrast (1.0 = normal) to factor
      // Formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
      const contrastPercent = (contrastVal - 1) * 255; // Convert 0.5-1.5 to -127 to 127
      const contrastFactor = (259 * (contrastPercent + 255)) / (255 * (259 - contrastPercent));
      
      for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        let r = data[i] * brightnessFactor;
        let g = data[i + 1] * brightnessFactor;
        let b = data[i + 2] * brightnessFactor;
        
        // Apply contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
        
        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {
      // getImageData will throw if canvas is tainted by CORS
      console.warn("Could not apply pixel manipulation (CORS restriction):", e);
    }
  }, []);

  // Draw preview on canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Get canvas display size
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Save context state
    ctx.save();

    // Try to use CSS filter first (more performant when it works)
    const supportsFilter = typeof ctx.filter !== 'undefined';
    if (supportsFilter) {
      ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
    }

    // Calculate the base image size to fill the canvas
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let baseWidth: number, baseHeight: number;

    if (imgAspect > aspectRatio) {
      // Image is wider than frame - fit by height to fill
      baseHeight = canvasHeight;
      baseWidth = baseHeight * imgAspect;
    } else {
      // Image is taller than frame - fit by width to fill
      baseWidth = canvasWidth;
      baseHeight = baseWidth / imgAspect;
    }

    // Apply zoom scaling
    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    // Move to center and apply transforms
    ctx.translate(canvasWidth / 2 + offsetX, canvasHeight / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw image centered
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Restore context
    ctx.restore();
    
    // If CSS filter isn't supported or didn't work, apply manual pixel manipulation
    if (!supportsFilter || (brightness !== 1 || contrast !== 1)) {
      // Test if the filter actually applied by checking if we can read pixels
      // If CSS filter worked, we don't need manual fallback
      try {
        // Quick check if canvas is readable (not tainted)
        ctx.getImageData(0, 0, 1, 1);
        // If CSS filter is not available, apply manually
        if (!supportsFilter) {
          applyBrightnessContrast(ctx, canvasWidth, canvasHeight, brightness, contrast);
        }
      } catch {
        // Canvas is tainted, can't apply manual fallback
        console.warn("Canvas is tainted, brightness/contrast preview limited");
      }
    }
  }, [imageLoaded, zoom, rotation, brightness, contrast, offsetX, offsetY, aspectRatio, applyBrightnessContrast]);

  // Redraw on any change
  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Mouse/touch handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setOffsetX((prev) => prev + deltaX);
    setOffsetY((prev) => prev + deltaY);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - lastMousePos.current.x;
    const deltaY = e.touches[0].clientY - lastMousePos.current.y;
    setOffsetX((prev) => prev + deltaX);
    setOffsetY((prev) => prev + deltaY);
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Control handlers
  const handleRotateLeft = () => setRotation((prev) => prev - 90);
  const handleRotateRight = () => setRotation((prev) => prev + 90);

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(1);
    setContrast(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Save handler with manual brightness/contrast fallback
  const handleSave = async () => {
    const img = imageRef.current;
    if (!img) {
      toast.error("No image loaded to save");
      return;
    }

    setSaving(true);

    try {
      const { width: outputWidth, height: outputHeight } = getOutputDimensions(imageType);

      // Create output canvas
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;
      const ctx = outputCanvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Fill with black background
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // Try CSS filter first
      const supportsFilter = typeof ctx.filter !== 'undefined';
      if (supportsFilter) {
        ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
      }

      // Calculate the base image size to fill the output canvas
      const imgAspect = img.naturalWidth / img.naturalHeight;
      let baseWidth: number, baseHeight: number;

      if (imgAspect > aspectRatio) {
        // Image is wider than frame - fit by height to fill
        baseHeight = outputHeight;
        baseWidth = baseHeight * imgAspect;
      } else {
        // Image is taller than frame - fit by width to fill
        baseWidth = outputWidth;
        baseHeight = baseWidth / imgAspect;
      }

      // Apply zoom scaling
      const drawWidth = baseWidth * zoom;
      const drawHeight = baseHeight * zoom;

      // Scale offset from preview to output size
      const previewCanvas = canvasRef.current;
      const scaleX = previewCanvas ? outputWidth / previewCanvas.width : 1;
      const scaleY = previewCanvas ? outputHeight / previewCanvas.height : 1;
      const scaledOffsetX = offsetX * scaleX;
      const scaledOffsetY = offsetY * scaleY;

      // Apply transforms
      ctx.save();
      ctx.translate(outputWidth / 2 + scaledOffsetX, outputHeight / 2 + scaledOffsetY);
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw image centered
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
      
      // Apply manual brightness/contrast if CSS filter isn't available
      if (!supportsFilter && (brightness !== 1 || contrast !== 1)) {
        applyBrightnessContrast(ctx, outputWidth, outputHeight, brightness, contrast);
      }

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        outputCanvas.toBlob(resolve, "image/webp", 0.9);
      });

      if (!blob) {
        throw new Error("Failed to create image blob");
      }

      onSave(blob);
      onOpenChange(false);
      toast.success("Image saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "We couldn't process that image. Please try again or choose a different file.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate canvas dimensions based on container and aspect ratio
  const getCanvasSize = () => {
    const maxWidth = 600;
    const maxHeight = 400;

    let width: number, height: number;

    if (aspectRatio >= 1) {
      // Landscape or square
      width = Math.min(maxWidth, maxHeight * aspectRatio);
      height = width / aspectRatio;
    } else {
      // Portrait
      height = Math.min(maxHeight, maxWidth / aspectRatio);
      width = height * aspectRatio;
    }

    return { width, height };
  };

  const canvasSize = getCanvasSize();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {imageType.charAt(0).toUpperCase() + imageType.slice(1)}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Preview Canvas */}
          <div
            ref={containerRef}
            className="relative mx-auto bg-black rounded-lg overflow-hidden cursor-move"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />

            {/* Crop frame overlay */}
            <div
              className="absolute inset-0 pointer-events-none border-2 border-white/50"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
              }}
            />

            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Zoom */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Zoom
                <span className="text-xs text-muted-foreground">({Math.round(zoom * 100)}%)</span>
              </label>
              <Slider
                value={[zoom]}
                min={0.5}
                max={3}
                step={0.01}
                onValueChange={(values) => setZoom(values[0])}
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Brightness
                <span className="text-xs text-muted-foreground">({Math.round(brightness * 100)}%)</span>
              </label>
              <Slider
                value={[brightness]}
                min={0.5}
                max={1.5}
                step={0.01}
                onValueChange={(values) => setBrightness(values[0])}
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Contrast className="h-4 w-4" />
                Contrast
                <span className="text-xs text-muted-foreground">({Math.round(contrast * 100)}%)</span>
              </label>
              <Slider
                value={[contrast]}
                min={0.5}
                max={1.5}
                step={0.01}
                onValueChange={(values) => setContrast(values[0])}
              />
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rotate</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotateLeft}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  90° Left
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotateRight}
                  className="flex-1"
                >
                  <RotateCw className="h-4 w-4 mr-1" />
                  90° Right
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset All
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !imageLoaded}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedImageEditorDialog;
