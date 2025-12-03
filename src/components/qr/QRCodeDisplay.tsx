import { useEffect, useState, useCallback, useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCornerTypesFromEyeStyle } from "./QRLivePreview";
import { toast } from "sonner";

export interface QRDisplaySettings {
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
  // Frame options
  frameEnabled?: boolean;
  frameStyle?: string;
  frameColor?: string;
  frameWidth?: number;
  frameBorderRadius?: number;
  frameShadow?: string;
  framePadding?: number;
}

interface QRCodeDisplayProps {
  url: string;
  settings?: QRDisplaySettings;
  size?: number;
  className?: string;
  showDownload?: boolean;
  downloadFileName?: string;
}

const dotTypeMap: Record<string, string> = {
  squares: "square",
  classy: "classy",
  rounded: "rounded",
  "classy-rounded": "classy-rounded",
  "extra-rounded": "extra-rounded",
  dots: "dots",
};

type EyeStyle = "square" | "extra-rounded" | "leaf" | "diamond" | "dot" | "star" | "heart" | "shield" | undefined;

async function compositeQRWithBackground(
  qrBlob: Blob,
  logoUrl: string,
  size: number,
  opacity: number,
  lightColor: string
): Promise<Blob> {
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
}

export default function QRCodeDisplay({
  url,
  settings = {},
  size = 192,
  className = "",
  showDownload = false,
  downloadFileName = "qr-code",
}: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const qrBlobRef = useRef<Blob | null>(null);

  const generateQR = useCallback(async () => {
    if (!url) return;
    
    setIsLoading(true);

    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;

      const isBackgroundMode = settings.logoPosition === "background" && settings.logoUrl;
      const { square: cornerSquareType, dot: cornerDotType } = getCornerTypesFromEyeStyle(
        settings.eyeStyle as EyeStyle
      );

      // Build gradient options if enabled
      const useGradient = settings.useGradient ?? false;
      const gradientColor1 = settings.gradientColor1 || "#000000";
      const gradientColor2 = settings.gradientColor2 || "#4F46E5";
      const gradientType = settings.gradientType || "linear";

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
          color: useGradient ? undefined : (settings.darkColor || "#000000"),
          type: (dotTypeMap[settings.pattern || "squares"] || "square") as any,
          gradient: gradientOptions,
        },
        backgroundOptions: {
          color: isBackgroundMode ? "transparent" : settings.lightColor || "#FFFFFF",
        },
        cornersSquareOptions: {
          color: useGradient ? undefined : (settings.darkColor || "#000000"),
          type: cornerSquareType as any,
          gradient: gradientOptions,
        },
        cornersDotOptions: {
          color: useGradient ? undefined : (settings.darkColor || "#000000"),
          type: cornerDotType as any,
          gradient: gradientOptions,
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 8,
          imageSize: 0.4,
        },
        image: !isBackgroundMode && settings.logoUrl ? settings.logoUrl : undefined,
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

      if (isBackgroundMode && settings.logoUrl) {
        blobData = await compositeQRWithBackground(
          blobData,
          settings.logoUrl,
          size,
          settings.logoOpacity || 0.3,
          settings.lightColor || "#FFFFFF"
        );
      }

      qrBlobRef.current = blobData;
      const dataUrl = URL.createObjectURL(blobData);
      setQrDataUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return dataUrl;
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    url,
    size,
    settings.darkColor,
    settings.lightColor,
    settings.pattern,
    settings.eyeStyle,
    settings.logoUrl,
    settings.logoPosition,
    settings.logoOpacity,
    settings.useGradient,
    settings.gradientColor1,
    settings.gradientColor2,
    settings.gradientType,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(generateQR, 100);
    return () => clearTimeout(timeoutId);
  }, [generateQR]);

  useEffect(() => {
    return () => {
      if (qrDataUrl) URL.revokeObjectURL(qrDataUrl);
    };
  }, [qrDataUrl]);

  const handleDownload = useCallback(async () => {
    if (!qrBlobRef.current) {
      toast.error("QR code not ready yet");
      return;
    }

    const frameEnabled = settings.frameEnabled ?? false;
    
    if (!frameEnabled) {
      // Simple download without frame
      const url = URL.createObjectURL(qrBlobRef.current);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${downloadFileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("QR code downloaded!");
      return;
    }

    // Download with frame
    const frameStyle = settings.frameStyle || "solid";
    const frameColor = settings.frameColor || "#000000";
    const frameWidth = settings.frameWidth || 4;
    const frameBorderRadius = settings.frameBorderRadius || 12;
    const framePadding = settings.framePadding || 16;
    const lightColor = settings.lightColor || "#FFFFFF";

    const canvas = document.createElement("canvas");
    const totalSize = size + (framePadding * 2) + (frameWidth * 2);
    canvas.width = totalSize;
    canvas.height = totalSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Could not create canvas");
      return;
    }

    // Draw background with rounded corners
    ctx.fillStyle = lightColor;
    if (frameBorderRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(frameWidth, frameWidth, totalSize - frameWidth * 2, totalSize - frameWidth * 2, frameBorderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(frameWidth, frameWidth, totalSize - frameWidth * 2, totalSize - frameWidth * 2);
    }

    // Draw border
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameWidth;
    if (frameStyle === "dashed") {
      ctx.setLineDash([frameWidth * 2, frameWidth]);
    } else if (frameStyle === "dotted") {
      ctx.setLineDash([frameWidth, frameWidth]);
    } else {
      ctx.setLineDash([]);
    }

    if (frameBorderRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(frameWidth / 2, frameWidth / 2, totalSize - frameWidth, totalSize - frameWidth, frameBorderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(frameWidth / 2, frameWidth / 2, totalSize - frameWidth, totalSize - frameWidth);
    }

    // Double border effect
    if (frameStyle === "double") {
      const innerOffset = frameWidth * 2;
      ctx.lineWidth = frameWidth / 2;
      if (frameBorderRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(
          innerOffset,
          innerOffset,
          totalSize - innerOffset * 2,
          totalSize - innerOffset * 2,
          Math.max(0, frameBorderRadius - innerOffset / 2)
        );
        ctx.stroke();
      } else {
        ctx.strokeRect(innerOffset, innerOffset, totalSize - innerOffset * 2, totalSize - innerOffset * 2);
      }
    }

    // Draw QR code
    const qrImg = new Image();
    qrImg.onload = () => {
      const qrX = frameWidth + framePadding;
      const qrY = frameWidth + framePadding;
      ctx.drawImage(qrImg, qrX, qrY, size, size);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to create download");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${downloadFileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("QR code downloaded!");
      }, "image/png");
    };
    qrImg.src = URL.createObjectURL(qrBlobRef.current);
  }, [downloadFileName, settings, size]);

  // Frame styling helpers
  const getFrameShadow = (shadow?: string) => {
    switch (shadow) {
      case "soft":
        return "0 2px 8px rgba(0,0,0,0.15)";
      case "medium":
        return "0 4px 16px rgba(0,0,0,0.25)";
      case "strong":
        return "0 8px 24px rgba(0,0,0,0.4)";
      default:
        return "none";
    }
  };

  const frameEnabled = settings.frameEnabled ?? false;
  const frameStyle = settings.frameStyle || "solid";
  const frameColor = settings.frameColor || "#000000";
  const frameWidth = settings.frameWidth || 4;
  const frameBorderRadius = settings.frameBorderRadius || 12;
  const frameShadow = settings.frameShadow || "none";
  const framePadding = settings.framePadding || 16;

  if (isLoading || !qrDataUrl) {
    const totalSize = frameEnabled ? size + (framePadding * 2) + (frameWidth * 2) : size;
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ width: totalSize, height: totalSize }}
      >
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {frameEnabled ? (
        <div
          style={{
            padding: framePadding,
            borderStyle: frameStyle,
            borderWidth: frameWidth,
            borderColor: frameColor,
            borderRadius: frameBorderRadius,
            boxShadow: getFrameShadow(frameShadow),
            backgroundColor: settings.lightColor || "#FFFFFF",
          }}
        >
          <img
            src={qrDataUrl}
            alt="QR Code"
            className={className}
            style={{ width: size, height: size, display: "block" }}
          />
        </div>
      ) : (
        <img
          src={qrDataUrl}
          alt="QR Code"
          className={`rounded-lg ${className}`}
          style={{ width: size, height: size }}
        />
      )}
      {showDownload && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download QR
        </Button>
      )}
    </div>
  );
}
