import { useEffect, useRef, useState, useCallback } from "react";
import type { QRSettings } from "../QRCodeCustomizer";

interface QRLivePreviewProps {
  settings: QRSettings;
  previewUrl?: string;
}

// Map pattern names to qr-code-styling dot types
const dotTypeMap: Record<string, string> = {
  'squares': 'square',
  'classy': 'classy',
  'rounded': 'rounded',
  'classy-rounded': 'classy-rounded',
  'extra-rounded': 'extra-rounded',
  'dots': 'dots',
};

// Map eye style names to qr-code-styling corner square types
// cornersSquareOptions supports: 'square', 'extra-rounded', 'dot'
const cornerSquareTypeMap: Record<string, string> = {
  'square': 'square',
  'extra-rounded': 'extra-rounded',
  'dot': 'dot',
  'leaf': 'extra-rounded',
  'diamond': 'square',
  'star': 'dot',
  'heart': 'extra-rounded',
  'shield': 'square',
};

// Map eye style names to qr-code-styling corner dot types
// cornersDotOptions only supports: 'square', 'dot'
const cornerDotTypeMap: Record<string, string> = {
  'square': 'square',
  'extra-rounded': 'dot',
  'dot': 'dot',
  'leaf': 'dot',
  'diamond': 'square',
  'star': 'dot',
  'heart': 'dot',
  'shield': 'square',
};

async function compositeQRWithBackground(
  qrBlob: Blob,
  logoUrl: string,
  size: number,
  opacity: number,
  lightColor: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Draw light background color
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size, size);

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = () => {
      // Draw logo as background with opacity
      ctx.globalAlpha = opacity;
      
      // Calculate dimensions to cover the entire QR while maintaining aspect ratio
      const logoAspect = logoImg.width / logoImg.height;
      let drawWidth = size;
      let drawHeight = size;
      let drawX = 0;
      let drawY = 0;

      if (logoAspect > 1) {
        // Logo is wider - fit to height
        drawHeight = size;
        drawWidth = size * logoAspect;
        drawX = (size - drawWidth) / 2;
      } else {
        // Logo is taller - fit to width
        drawWidth = size;
        drawHeight = size / logoAspect;
        drawY = (size - drawHeight) / 2;
      }

      ctx.drawImage(logoImg, drawX, drawY, drawWidth, drawHeight);
      ctx.globalAlpha = 1;

      // Now draw the QR code on top
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
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
      const QRCodeStyling = (await import('qr-code-styling')).default;
      
      // Clean up previous instance
      if (qrCodeRef.current) {
        qrCodeRef.current = null;
      }

      const isBackgroundMode = settings.logoPosition === 'background' && settings.logoUrl;
      const size = 200;

      const qrCode = new QRCodeStyling({
        width: size,
        height: size,
        data: previewUrl,
        margin: 8,
        dotsOptions: {
          color: settings.darkColor || "#000000",
          type: (dotTypeMap[settings.pattern || 'squares'] || 'square') as any,
        },
        backgroundOptions: {
          // Use transparent background for background mode so logo shows through
          color: isBackgroundMode ? 'transparent' : (settings.lightColor || "#FFFFFF"),
        },
        cornersSquareOptions: {
          color: settings.darkColor || "#000000",
          type: (cornerSquareTypeMap[settings.eyeStyle || 'square'] || 'square') as any,
        },
        cornersDotOptions: {
          color: settings.darkColor || "#000000",
          type: (cornerDotTypeMap[settings.eyeStyle || 'square'] || 'square') as any,
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 8,
          imageSize: 0.4,
        },
        // Only use center logo if not in background mode
        image: (!isBackgroundMode && settings.logoUrl) ? settings.logoUrl : undefined,
      });

      qrCodeRef.current = qrCode;
      
      // Get as data URL instead of appending to DOM
      let blob = await qrCode.getRawData('png');
      if (!blob) throw new Error('Failed to generate QR');

      // Handle Buffer type
      let blobData: Blob;
      if (blob instanceof Blob) {
        blobData = blob;
      } else {
        const uint8Array = new Uint8Array(blob as unknown as ArrayBuffer);
        blobData = new Blob([uint8Array], { type: 'image/png' });
      }

      // If background mode, composite the logo behind the QR
      if (isBackgroundMode && settings.logoUrl) {
        blobData = await compositeQRWithBackground(
          blobData,
          settings.logoUrl,
          size,
          settings.logoOpacity || 0.3,
          settings.lightColor || "#FFFFFF"
        );
      }

      const url = URL.createObjectURL(blobData);
      setQrDataUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      console.error('Error generating QR preview:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settings.darkColor, settings.lightColor, settings.pattern, settings.eyeStyle, settings.logoUrl, settings.logoPosition, settings.logoOpacity, previewUrl]);

  useEffect(() => {
    const timeoutId = setTimeout(generatePreview, 200);
    return () => clearTimeout(timeoutId);
  }, [generatePreview]);

  useEffect(() => {
    return () => {
      if (qrDataUrl) URL.revokeObjectURL(qrDataUrl);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/30 border">
      <p className="text-sm font-medium text-muted-foreground">Live Preview</p>
      <div 
        className={`relative flex items-center justify-center rounded-lg overflow-hidden transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
        style={{ width: 200, height: 200 }}
      >
        {qrDataUrl ? (
          <img 
            src={qrDataUrl} 
            alt="QR Code Preview" 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Generating...</span>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Preview updates as you change settings
      </p>
    </div>
  );
}
