import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getCornerTypesFromEyeStyle } from "@/components/qr/QRLivePreview";

interface ShareCardDialogProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QRThemeSettings {
  pattern?: string;
  eyeStyle?: string;
  darkColor?: string;
  lightColor?: string;
  logoUrl?: string;
  logoPosition?: string;
  logoOpacity?: number;
  useGradient?: boolean;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientType?: string;
}

interface CardData {
  slug: string;
  share_url: string;
  public_url: string;
  theme?: {
    qr?: QRThemeSettings;
  } | null;
}

export default function ShareCardDialog({ cardId, open, onOpenChange }: ShareCardDialogProps) {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadCard();
    }
  }, [open, cardId]);

  useEffect(() => {
    if (card?.public_url || card?.share_url) {
      generateQR();
    }
  }, [card]);

  const loadCard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("slug, share_url, public_url, theme")
      .eq("id", cardId)
      .single();

    if (error) {
      toast.error("Failed to load card");
    } else {
      setCard(data as CardData);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    const url = card?.public_url || card?.share_url;
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success(`✅ Share link copied: ${url}`);
  };

  const dotTypeMap: Record<string, string> = {
    squares: "square",
    classy: "classy",
    rounded: "rounded",
    "classy-rounded": "classy-rounded",
    "extra-rounded": "extra-rounded",
    dots: "dots",
  };

  const generateQR = async () => {
    const url = card?.public_url || card?.share_url;
    if (!url) return;

    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;
      const qrSettings = card?.theme?.qr || {};
      const size = 512;

      const isBackgroundMode = qrSettings.logoPosition === "background" && qrSettings.logoUrl;
      const { square: cornerSquareType, dot: cornerDotType } = getCornerTypesFromEyeStyle(
        qrSettings.eyeStyle as any
      );

      // Build gradient options if enabled
      const useGradient = qrSettings.useGradient ?? false;
      const gradientColor1 = qrSettings.gradientColor1 || "#000000";
      const gradientColor2 = qrSettings.gradientColor2 || "#4F46E5";
      const gradientType = qrSettings.gradientType || "linear";

      const gradientOptions = useGradient
        ? {
            type: gradientType as "linear" | "radial",
            rotation: gradientType === "linear" ? 45 : 0,
            colorStops: [
              { offset: 0, color: gradientColor1 },
              { offset: 1, color: gradientColor2 },
            ],
          }
        : undefined;

      const qrCode = new QRCodeStyling({
        width: size,
        height: size,
        data: url,
        margin: 8,
        dotsOptions: {
          color: useGradient ? undefined : (qrSettings.darkColor || "#000000"),
          type: (dotTypeMap[qrSettings.pattern || "squares"] || "square") as any,
          gradient: gradientOptions,
        },
        backgroundOptions: {
          color: isBackgroundMode ? "transparent" : qrSettings.lightColor || "#FFFFFF",
        },
        cornersSquareOptions: {
          color: useGradient ? undefined : (qrSettings.darkColor || "#000000"),
          type: cornerSquareType as any,
          gradient: gradientOptions,
        },
        cornersDotOptions: {
          color: useGradient ? undefined : (qrSettings.darkColor || "#000000"),
          type: cornerDotType as any,
          gradient: gradientOptions,
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 8,
          imageSize: 0.4,
        },
        image: !isBackgroundMode && qrSettings.logoUrl ? qrSettings.logoUrl : undefined,
      });

      let blob = await qrCode.getRawData("png");
      if (!blob) throw new Error("Failed to generate QR");

      let blobData: Blob;
      if (blob instanceof Blob) {
        blobData = blob;
      } else {
        const uint8Array = new Uint8Array(blob as unknown as ArrayBuffer);
        blobData = new Blob([uint8Array], { type: "image/png" });
      }

      // Handle background logo mode
      if (isBackgroundMode && qrSettings.logoUrl) {
        blobData = await compositeQRWithBackground(
          blobData,
          qrSettings.logoUrl,
          size,
          qrSettings.logoOpacity || 0.3,
          qrSettings.lightColor || "#FFFFFF"
        );
      }

      const dataUrl = URL.createObjectURL(blobData);
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  };

  const compositeQRWithBackground = (
    qrBlob: Blob,
    logoUrl: string,
    size: number,
    opacity: number,
    lightColor: string
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.fillStyle = lightColor;
      ctx.fillRect(0, 0, size, size);

      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        ctx.globalAlpha = opacity;

        const logoAspect = logoImg.width / logoImg.height;
        let drawWidth = size;
        let drawHeight = size;
        let drawX = 0;
        let drawY = 0;

        if (logoAspect > 1) {
          drawHeight = size;
          drawWidth = size * logoAspect;
          drawX = (size - drawWidth) / 2;
        } else {
          drawWidth = size;
          drawHeight = size / logoAspect;
          drawY = (size - drawHeight) / 2;
        }

        ctx.drawImage(logoImg, drawX, drawY, drawWidth, drawHeight);
        ctx.globalAlpha = 1;

        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 0, 0, size, size);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          }, "image/png");
        };
        qrImg.onerror = reject;
        qrImg.src = URL.createObjectURL(qrBlob);
      };
      logoImg.onerror = reject;
      logoImg.src = logoUrl;
    });
  };

  const downloadQR = async () => {
    if (!qrDataUrl || !card) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `card-ex-${card.slug}.png`;
    link.click();
    toast.success("QR code downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Card
          </DialogTitle>
          <DialogDescription>
            Share your digital business card with a unique URL and QR code.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : card ? (
          <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-url">Share URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={card.public_url || card.share_url}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.public_url?.includes('/c/') 
                    ? 'This is your permanent shareable link' 
                    : 'This is your branded short URL'}
                </p>
              </div>

            {qrDataUrl && (
              <div className="space-y-2">
                <Label>QR Code</Label>
                <div className="flex flex-col items-center gap-2 rounded-lg border p-4 bg-card">
                  <img src={qrDataUrl} alt="QR Code" className="h-48 w-48" />
                  <Button
                    variant="outline"
                    onClick={downloadQR}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load card
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
