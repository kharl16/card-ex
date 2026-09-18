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

  const settle = useCallback(
    (el: HTMLImageElement | null) => {
      if (!el) return;
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

  // Images restored from the browser cache can finish loading before React
  // attaches onLoad, which previously left the tile stuck on the skeleton.
  // Settle from the element itself as soon as it is mounted / src changes.
  const attachRef = useCallback(
    (el: HTMLImageElement | null) => {
      imgRef.current = el;
      if (el?.complete) settle(el);
    },
    [settle]
  );

  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.currentSrc) settle(el);
  }, [src, settle]);

  const retriedRef = useRef<string | null>(null);

  const handleError = useCallback(() => {
    const el = imgRef.current;
    // One silent retry — transient CDN/network failures are the usual cause of
    // a whole row appearing blank.
    if (el && retriedRef.current !== src) {
      retriedRef.current = src;
      const bust = `${src}${src.includes("?") ? "&" : "?"}r=1`;
      window.setTimeout(() => {
        if (imgRef.current) imgRef.current.src = bust;
      }, 400);
      return;
    }
    setStatus("error");
  }, [src]);

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
          ref={attachRef}
          src={src}
          alt={alt}
          onLoad={(e) => settle(e.currentTarget)}
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
