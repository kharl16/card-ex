import { useEffect, useRef, useState, useCallback } from "react";
import type { QRSettings } from "../QRCodeCustomizer";

interface QRLivePreviewProps {
  settings: QRSettings;
  previewUrl?: string;
}

// ----- Pattern (dots) mapping -----
const dotTypeMap: Record<string, string> = {
  squares: "square",
  classy: "classy",
  rounded: "rounded",
  "classy-rounded": "classy-rounded",
  "extra-rounded": "extra-rounded",
  dots: "dots",
  "triangle-grid": "classy", // Map to classy as fallback - library doesn't support triangles natively
};

// EyeStyle values we expect from QRSettings
type EyeStyle = "square" | "extra-rounded" | "leaf" | "diamond" | "dot" | "star" | "heart" | "shield" | "soft-corner" | undefined;

// Library-supported corner types
type CornerSquareType = "square" | "extra-rounded" | "dot";
type CornerDotType = "square" | "dot";

// Centralized resolver so Card Editor / Preview / Card can all use the same logic
export function getCornerTypesFromEyeStyle(eyeStyle: EyeStyle): { square: CornerSquareType; dot: CornerDotType } {
  switch (eyeStyle) {
    case "extra-rounded":
      // "Rounded" eyes in the UI
      return { square: "extra-rounded", dot: "square" };

    case "leaf":
    case "heart":
      // Softer / organic feel → map to extra-rounded
      return { square: "extra-rounded", dot: "dot" };

    case "diamond":
    case "shield":
      // Strong / angular feel → map to square
      return { square: "square", dot: "square" };

    case "dot":
    case "star":
      // Small dot-eyes
      return { square: "dot", dot: "dot" };

    case "soft-corner":
      // Soft corner frame with rounded inner → extra-rounded outer, square inner
      return { square: "extra-rounded", dot: "square" };

    case "square":
    default:
      return { square: "square", dot: "square" };
  }
}

async function compositeQRWithBackground(
  qrBlob: Blob,
  logoUrl: string,
  size: number,
  opacity: number,
  lightColor: string,
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

export function QRLivePreview({ settings, previewUrl = "https://card-ex.com/preview" }: QRLivePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const qrCodeRef = useRef<any>(null);

  const generatePreview = useCallback(async () => {
    setIsLoading(true);

    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;

      if (qrCodeRef.current) {
        qrCodeRef.current = null;
      }

      const isBackgroundMode = settings.logoPosition === "background" && settings.logoUrl;
      const size = 200;

      // Resolve corner types from our EyeStyle mapping
      const { square: cornerSquareType, dot: cornerDotType } = getCornerTypesFromEyeStyle(
        settings.eyeStyle as EyeStyle,
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
        data: previewUrl,
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

      qrCodeRef.current = qrCode;

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
          settings.lightColor || "#FFFFFF",
        );
      }

      const url = URL.createObjectURL(blobData);
      setQrDataUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      console.error("Error generating QR preview:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
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
    previewUrl,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(generatePreview, 200);
    return () => clearTimeout(timeoutId);
  }, [generatePreview]);

  useEffect(() => {
    return () => {
      if (qrDataUrl) URL.revokeObjectURL(qrDataUrl);
    };
  }, [qrDataUrl]);

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

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/30 border">
      <p className="text-sm font-medium text-muted-foreground">Live Preview</p>
      <div
        className={`relative flex items-center justify-center transition-opacity duration-200 ${
          isLoading ? "opacity-50" : "opacity-100"
        }`}
      >
        {qrDataUrl ? (
          frameEnabled ? (
            <div
              style={{
                padding: framePadding * 0.6, // Scale down for preview
                borderStyle: frameStyle,
                borderWidth: Math.max(1, frameWidth * 0.6),
                borderColor: frameColor,
                borderRadius: frameBorderRadius * 0.6,
                boxShadow: getFrameShadow(frameShadow),
                backgroundColor: settings.lightColor || "#FFFFFF",
              }}
            >
              <img
                src={qrDataUrl}
                alt="QR Code Preview"
                style={{ width: 160, height: 160, display: "block" }}
              />
            </div>
          ) : (
            <img
              src={qrDataUrl}
              alt="QR Code Preview"
              className="rounded-lg"
              style={{ width: 200, height: 200 }}
            />
          )
        ) : (
          <div
            className="bg-muted flex items-center justify-center rounded-lg"
            style={{ width: 200, height: 200 }}
          >
            <span className="text-xs text-muted-foreground">Generating...</span>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">Preview updates as you change settings</p>
    </div>
  );
}
