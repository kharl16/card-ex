import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const generatePreview = async () => {
      if (!containerRef.current) return;
      
      setIsLoading(true);
      
      try {
        const QRCodeStyling = (await import('qr-code-styling')).default;
        
        // Clear previous QR code
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
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
        
        if (isMounted && containerRef.current) {
          qrCode.append(containerRef.current);
        }
      } catch (error) {
        console.error('Error generating QR preview:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Debounce the generation
    const timeoutId = setTimeout(generatePreview, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [settings.darkColor, settings.lightColor, settings.pattern, settings.eyeStyle, settings.logoUrl, previewUrl]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/30 border">
      <p className="text-sm font-medium text-muted-foreground">Live Preview</p>
      <div 
        ref={containerRef} 
        className={`relative flex items-center justify-center rounded-lg overflow-hidden transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
        style={{ minWidth: 200, minHeight: 200 }}
      >
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
