import React from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import SafeImage from "@/components/SafeImage";

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
  aspect?: "portrait" | "video";
  onSelect: () => void;
  className?: string;
}

/**
 * A single focusable tile inside an immersive showcase row.
 * Hover/focus scales the tile and reveals its caption overlay.
 */
export default function ShowcaseItem({
  src,
  alt,
  caption,
  srp,
  isVideo = false,
  aspect = "portrait",
  onSelect,
  className,
}: ShowcaseItemProps) {
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
        aspect === "video"
          ? "w-[240px] sm:w-[280px] lg:w-[320px] aspect-video"
          : "w-[132px] sm:w-[156px] lg:w-[180px] aspect-[3/4]",
        className
      )}
    >
      <SafeImage
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
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
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/40">
          {srp}
        </span>
      )}

      {caption && (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 pb-2 pt-6",
            "text-left text-[11px] font-medium leading-tight text-white",
            "line-clamp-2 opacity-0 transition-opacity duration-300",
            "group-hover:opacity-100 group-focus-visible:opacity-100"
          )}
        >
          {caption}
        </span>
      )}
    </button>
  );
}
