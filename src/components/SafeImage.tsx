import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [attempt, setAttempt] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimensionsRef = useRef(onDimensions);
  dimensionsRef.current = onDimensions;

  const requestSrc = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`;

  // Reset state whenever the source changes so the skeleton reappears.
  useEffect(() => {
    setStatus("loading");
    setAttempt(0);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
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
      dimensionsRef.current?.({ width: w, height: h });
      setStatus("loaded");
    },
    [maxMegapixels]
  );

  // Images restored from the browser cache can finish loading before React
  // attaches onLoad, which previously left the tile stuck on the skeleton.
  // Settle from the element itself as soon as it is mounted / src changes.
  const attachRef = useCallback(
    (el: HTMLImageElement | null) => {
      imgRef.current = el;
      if (el?.complete && el.naturalWidth) settle(el);
    },
    [settle]
  );

  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth) settle(el);
  }, [requestSrc, settle]);

  const handleError = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (attempt >= 3) {
      setStatus("error");
      return;
    }
    // Keep retrying a transient CDN/network failure without imperative DOM
    // mutations (which React can overwrite on the next carousel render).
    retryTimer.current = setTimeout(() => setAttempt((value) => value + 1), 400 * (attempt + 1));
  }, [attempt]);

  useEffect(() => {
    if (status !== "error") return;
    const retry = () => {
      setStatus("loading");
      setAttempt((value) => value + 1);
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [status]);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", wrapperClassName, className)} style={style}>
      {status === "loading" && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-[inherit]" />
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white/70 text-xs">
          <ImageOff className="h-6 w-6" />
          <span>Image unavailable</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }} aria-label={`Retry loading ${alt || "image"}`}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      )}
      {status !== "error" && (
        <img
          ref={attachRef}
          src={requestSrc}
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
