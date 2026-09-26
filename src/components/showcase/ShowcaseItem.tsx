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
  /** Shared media ratio used to align every tile in the same row. */
  mediaAspectRatio?: number;
  onDimensions?: (dims: { width: number; height: number }) => void;
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
  mediaAspectRatio,
  onDimensions,
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
        "group relative flex shrink-0 flex-col overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10",
        "transition-transform duration-300 ease-out will-change-transform",
        "hover:z-10 hover:scale-[1.06] focus-visible:z-10 focus-visible:scale-[1.06]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
        resolvedAspect === "video" || resolvedAspect === "landscape"
          ? "w-[240px] sm:w-[280px] lg:w-[320px]"
          : resolvedAspect === "original"
            ? "w-[168px] sm:w-[196px] lg:w-[224px]"
            : "w-[132px] sm:w-[156px] lg:w-[180px]",
        className
      )}
    >
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden bg-black/40",
          resolvedAspect === "video" || resolvedAspect === "landscape"
            ? "aspect-video"
            : resolvedAspect === "portrait"
              ? "aspect-[3/4]"
              : undefined
        )}
        style={
          resolvedAspect === "original"
            ? { aspectRatio: mediaAspectRatio ?? naturalRatio ?? 3 / 4 }
            : undefined
        }
      >
        {src ? (
          <SafeImage
            src={src}
            alt={alt}
            loading="eager"
            decoding="sync"
            className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
            imgClassName="object-contain"
            onDimensions={({ width, height }) => {
              setNaturalRatio(width / height);
              onDimensions?.({ width, height });
            }}
          />
        ) : isVideo ? (
          <span className="absolute inset-0 flex items-center justify-center bg-card" aria-label="Video preview">
            <Play className="h-8 w-8 text-primary" aria-hidden="true" />
          </span>
        ) : null}

        {isVideo && !!src && (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
              <Play className="h-5 w-5 translate-x-[1px] fill-white text-white" />
            </span>
          </span>
        )}
      </div>

      {(srp || caption) && (
        <span
          className="flex w-full flex-col items-center gap-0.5 border-t border-white/10 px-1.5 py-1"
        >
          {srp && (
            <span className="max-w-full truncate rounded-full bg-black/70 px-2.5 py-0.5 text-center text-[10px] font-semibold text-primary ring-1 ring-primary/40">
              {srp}
            </span>
          )}
          {caption && (
            <span className="block max-w-full overflow-hidden text-center text-[11px] font-medium leading-[1.35] text-white line-clamp-3">
              {caption}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
