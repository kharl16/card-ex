import React from "react";
import { Play, Info } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { Button } from "@/components/ui/button";

interface ShowcaseHeroProps {
  /** Backdrop image (brochure cover, first video poster, or first product) */
  src: string;
  title: string;
  subtitle?: string;
  categoryLabel: string;
  isVideo?: boolean;
  onOpen: () => void;
  onBrowse?: () => void;
}

/**
 * Cinematic hero banner that opens the immersive showcase.
 * Reuses existing card media only — it never uploads or replaces content.
 */
export default function ShowcaseHero({
  src,
  title,
  subtitle,
  categoryLabel,
  isVideo = false,
  onOpen,
  onBrowse,
}: ShowcaseHeroProps) {
  return (
    <header className="relative isolate overflow-hidden">
      <div className="relative h-[52vw] max-h-[420px] min-h-[220px] w-full">
        <SafeImage
          src={src}
          alt={title}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {categoryLabel}
        </p>
        <h1 className="text-xl font-bold leading-tight text-white drop-shadow-lg sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 line-clamp-2 max-w-md text-xs text-white/70 sm:text-sm">{subtitle}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onOpen}
            className="h-9 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"
          >
            {isVideo ? (
              <Play className="mr-1.5 h-4 w-4 fill-black" />
            ) : (
              <Info className="mr-1.5 h-4 w-4" />
            )}
            {isVideo ? "Play" : "View"}
          </Button>
          {onBrowse && (
            <Button
              type="button"
              variant="secondary"
              onClick={onBrowse}
              className="h-9 rounded-full bg-white/15 px-5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25"
            >
              Browse All
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
