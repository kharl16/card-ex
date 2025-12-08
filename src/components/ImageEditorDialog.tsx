import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  /**
   * Optional aspect ratio (e.g. 16/9).
   * If not provided we just let the image decide visually.
   */
  aspectRatio?: number;
  onSave: (blob: Blob) => void;
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
  aspectRatio,
  onSave,
}: ImageEditorDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset state whenever dialog opens with a new image
  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixelsParam: any) => {
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        {/* Fixed-height container so the image can stretch full width */}
        <div
          className="relative w-full rounded-md bg-black/90 overflow-hidden"
          style={{
            // 16:9–ish viewing window; tall enough for your cover
            height: "min(70vh, 480px)",
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            aspect={aspectRatio ?? 16 / 9}
            showGrid={false}
            // Make the crop frame fill the whole visible area
            style={{
              containerStyle: {
                width: "100%",
                height: "100%",
              },
              cropAreaStyle: {
                width: "100%",
                height: "100%",
                // remove rounded corners so it feels like the whole image
                borderRadius: 0,
              },
              mediaStyle: {
                width: "100%",
                height: "100%",
                objectFit: "cover", // cover the whole area, no side gaps
              },
            }}
            minZoom={1}
            maxZoom={3}
            restrictPosition={false}
          />
        </div>

        {/* Zoom control */}
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
