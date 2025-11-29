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

// Map eye style names to qr-code-styling corner types
const cornerTypeMap: Record<string, string> = {
  'square': 'square',
  'extra-rounded': 'extra-rounded',
  'leaf': 'leaf',
  'diamond': 'square',
  'dot': 'dot',
};

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

      const qrCode = new QRCodeStyling({
        width: 200,
        height: 200,
        data: previewUrl,
        margin: 8,
        dotsOptions: {
          color: settings.darkColor || "#000000",
          type: (dotTypeMap[settings.pattern || 'squares'] || 'square') as any,
        },
        backgroundOptions: {
          color: settings.lightColor || "#FFFFFF",
        },
        cornersSquareOptions: {
          color: settings.darkColor || "#000000",
          type: (cornerTypeMap[settings.eyeStyle || 'square'] || 'square') as any,
        },
        cornersDotOptions: {
          color: settings.darkColor || "#000000",
          type: (cornerTypeMap[settings.eyeStyle || 'square'] || 'square') as any,
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 8,
          imageSize: 0.4,
        },
        image: settings.logoUrl || undefined,
      });

      qrCodeRef.current = qrCode;
      
      // Get as data URL instead of appending to DOM
      const blob = await qrCode.getRawData('png');
      if (blob) {
        let blobData: Blob;
        if (blob instanceof Blob) {
          blobData = blob;
        } else {
          // Handle Buffer type - convert to Uint8Array first
          const uint8Array = new Uint8Array(blob as unknown as ArrayBuffer);
          blobData = new Blob([uint8Array], { type: 'image/png' });
        }
        const url = URL.createObjectURL(blobData);
        setQrDataUrl(prev => {
          // Clean up previous blob URL
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch (error) {
      console.error('Error generating QR preview:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settings.darkColor, settings.lightColor, settings.pattern, settings.eyeStyle, settings.logoUrl, previewUrl]);

  useEffect(() => {
    // Debounce the generation
    const timeoutId = setTimeout(generatePreview, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [generatePreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (qrDataUrl) {
        URL.revokeObjectURL(qrDataUrl);
      }
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
