import React, { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import SafeImage from "@/components/SafeImage";
import type { BrochurePageShape } from "@/lib/carouselTypes";

interface ShowcaseItemProps {
  /** Poster / thumbnail image */
  src: string;
  alt: string;
  /** Optional caption shown under the tile */
  caption?: string;
  /** Optional SRP / price badge */
  srp?: string;
  /** Renders a play affordance for video tiles */
  isVideo?: boolean;
  /** Portrait tiles for images, landscape (16:9) for videos */
  aspect?: "portrait" | "landscape" | "original" | "video";
  pageShape?: BrochurePageShape;
  onSelect: () => void;
  className?: string;
}

/**
 * A single focusable tile inside an immersive showcase row.
 * Hover/focus scales the tile while its caption and price remain visible.
 */
export default function ShowcaseItem({
  src,
  alt,
  caption,
  srp,
  isVideo = false,
  aspect = "portrait",
  pageShape,
  onSelect,
  className,
}: ShowcaseItemProps) {
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const resolvedAspect = pageShape ?? aspect;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={alt}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10",
        "transition-transform duration-300 ease-out will-change-transform",
        "hover:z-10 hover:scale-[1.06] focus-visible:z-10 focus-visible:scale-[1.06]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
        resolvedAspect === "video" || resolvedAspect === "landscape"
          ? "w-[240px] sm:w-[280px] lg:w-[320px] aspect-video"
          : resolvedAspect === "original"
            ? "w-[168px] sm:w-[196px] lg:w-[224px]"
            : "w-[132px] sm:w-[156px] lg:w-[180px] aspect-[3/4]",
        className
      )}
      style={resolvedAspect === "original" ? { aspectRatio: naturalRatio ?? 3 / 4 } : undefined}
    >
      <SafeImage
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
        imgClassName="object-contain"
        onDimensions={({ width, height }) => setNaturalRatio(width / height)}
      />

      {isVideo && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Play className="h-5 w-5 translate-x-[1px] fill-white text-white" />
          </span>
        </span>
      )}

      {srp && (
        <span className="absolute left-1/2 top-1.5 max-w-[calc(100%-0.75rem)] -translate-x-1/2 truncate rounded-full bg-black/70 px-2 py-0.5 text-center text-[10px] font-semibold text-primary ring-1 ring-primary/40">
          {srp}
        </span>
      )}

      {caption && (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 pb-2 pt-9",
            "line-clamp-3 text-center text-[11px] font-medium leading-tight text-white"
          )}
        >
          {caption}
        </span>
      )}
    </button>
  );
}
