import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff } from "lucide-react";

export interface SafeImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  src: string;
  alt?: string;
  /** Called with intrinsic pixel dimensions once the image has loaded. */
  onDimensions?: (dims: { width: number; height: number }) => void;
  /** Reject images whose intrinsic pixel area exceeds this many megapixels. Default 60 MP. */
  maxMegapixels?: number;
  /** Optional className applied to the outer wrapper (skeleton + image share this box). */
  wrapperClassName?: string;
  /** Optional className applied to the loaded <img>. */
  imgClassName?: string;
}

/**
 * Image with a clean loading skeleton, error fallback, and a guard against
 * absurdly large / corrupted images that would otherwise blow up layout.
 *
 * The image itself is absolutely positioned to fill the wrapper. Give the
 * wrapper a fixed size or aspect-ratio (e.g. `aspect-square`) so the layout
 * is stable before the image measures its intrinsic dimensions.
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = "",
  onDimensions,
  maxMegapixels = 60,
  wrapperClassName,
  imgClassName,
  className,
  style,
  ...imgProps
}) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset state whenever the source changes so the skeleton reappears.
  useEffect(() => {
    setStatus("loading");
  }, [src]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      const w = el.naturalWidth;
      const h = el.naturalHeight;
      // Guard: 0×0 usually = decode failure; oversized = likely corrupt or unsafe to render.
      if (!w || !h || (w * h) / 1_000_000 > maxMegapixels) {
        setStatus("error");
        return;
      }
      onDimensions?.({ width: w, height: h });
      setStatus("loaded");
    },
    [maxMegapixels, onDimensions]
  );

  const handleError = useCallback(() => setStatus("error"), []);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", wrapperClassName, className)} style={style}>
      {status === "loading" && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-[inherit]" />
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white/70 text-xs">
          <ImageOff className="h-6 w-6" />
          <span>Image unavailable</span>
        </div>
      )}
      {status !== "error" && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
          {...imgProps}
          className={cn(
            "absolute inset-0 w-full h-full object-contain transition-opacity duration-200",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      )}
    </div>
  );
};

export default SafeImage;
