import { useEffect, useState, useCallback } from "react";
import { getCornerTypesFromEyeStyle } from "./QRLivePreview";

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
}

interface QRCodeDisplayProps {
  url: string;
  settings?: QRDisplaySettings;
  size?: number;
  className?: string;
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
}: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading || !qrDataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code"
      className={`rounded-lg ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
