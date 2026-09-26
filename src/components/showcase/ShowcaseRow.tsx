import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ShowcaseItem from "@/components/showcase/ShowcaseItem";
import type { BrochurePageShape } from "@/lib/carouselTypes";

export interface ShowcaseRowTile {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  srp?: string;
  isVideo?: boolean;
  /** Index into the full (unfiltered) category — used to open the correct lightbox/video item */
  originalIndex: number;
}

interface ShowcaseRowProps {
  id?: string;
  title: string;
  tiles: ShowcaseRowTile[];
  /** Total items in the category (may exceed the tiles rendered in the row) */
  totalCount: number;
  aspect?: "portrait" | "landscape" | "original" | "video";
  pageShape?: BrochurePageShape;
  /** Number of complete tiles visible in portrait and landscape phone layouts. */
  portraitItems?: 1 | 2 | 3;
  landscapeItems?: 2 | 3 | 4;
  searchQuery?: string;
  activeTileId?: string;
  onSelect: (originalIndex: number) => void;
  onViewAll?: () => void;
  /** Owner-configured call-to-action shown beneath the row */
  ctaLabel?: string;
  onCta?: () => void;
}

/**
 * A horizontally scrollable, keyboard-navigable row of showcase tiles,
 * presented as its own visually separated section with search + optional CTA.
 * Uses native scroll snapping so it stays smooth on mobile without JS.
 */
export default function ShowcaseRow({
  id,
  title,
  tiles,
  totalCount,
  aspect = "portrait",
  onSelect,
  onViewAll,
  ctaLabel,
  onCta,
  pageShape,
  portraitItems = 1,
  landscapeItems = 2,
  searchQuery = "",
  activeTileId,
}: ShowcaseRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [tileRatios, setTileRatios] = useState<Record<string, number>>({});
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touching = useRef(false);

  const filteredTiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tiles;
    return tiles.filter((t) =>
      [t.alt, t.caption, t.srp].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [tiles, searchQuery]);

  // Infinite loop: render 3 copies of the tiles and silently re-center the
  // scroll position whenever the user swipes into a cloned copy. Disabled
  // while searching so match highlighting stays unambiguous.
  const isLooping = !searchQuery.trim() && filteredTiles.length > 1;

  // A shared ratio based on the row's shortest natural entry keeps every
  // media frame aligned and prevents a tall item from creating empty space.
  const rowAspectRatio = useMemo(() => {
    const ratios = filteredTiles
      .map((tile) => tileRatios[tile.id])
      .filter((ratio): ratio is number => typeof ratio === "number" && ratio > 0);
    if (!ratios.length) return undefined;
    // Ignore rare landscape/square outliers so they don't shrink a row of
    // portrait photos (e.g. one wide testimony among tall testimonies).
    // Landscape tiles still fit inside the shared frame via object-contain.
    const portraitRatios = ratios.filter((ratio) => ratio <= 1);
    const pool = portraitRatios.length ? portraitRatios : ratios;
    return Math.max(...pool);
  }, [filteredTiles, tileRatios]);

  const rememberDimensions = useCallback(
    (tileId: string, { width, height }: { width: number; height: number }) => {
      if (!width || !height) return;
      const ratio = width / height;
      setTileRatios((current) =>
        current[tileId] === ratio ? current : { ...current, [tileId]: ratio }
      );
    },
    []
  );

  const renderedTiles = useMemo(() => {
    if (!isLooping) return filteredTiles.map((tile) => ({ tile, key: tile.id }));
    return [0, 1, 2].flatMap((copy) =>
      filteredTiles.map((tile) => ({ tile, key: `${tile.id}__c${copy}` }))
    );
  }, [filteredTiles, isLooping]);

  const jumpToMatch = useCallback(
    (ordinal: number) => {
      const el = scrollerRef.current;
      const tile = filteredTiles[ordinal];
      if (!el || !tile) return;
      const node = el.querySelector<HTMLElement>(`[data-tile-id="${tile.id}"]`);
      node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    },
    [filteredTiles]
  );

  useEffect(() => {
    if (!activeTileId) return;
    const ordinal = filteredTiles.findIndex((tile) => tile.id === activeTileId);
    if (ordinal >= 0) jumpToMatch(ordinal);
  }, [activeTileId, filteredTiles, jumpToMatch]);

  const copyWidth = useCallback((el: HTMLDivElement) => {
    const first = el.children[0] as HTMLElement | undefined;
    const middle = el.children[filteredTiles.length] as HTMLElement | undefined;
    return first && middle ? middle.offsetLeft - first.offsetLeft : 0;
  }, [filteredTiles.length]);

  const recenter = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !isLooping || touching.current) return;
    const width = copyWidth(el);
    if (!width) return;
    const first = el.children[0] as HTMLElement;
    const start = first.offsetLeft;
    const x = el.scrollLeft;
    // Never move the track under a finger or while momentum is running. Jump
    // only after scrolling settles, to the identical tile in the middle copy.
    if (x >= start + width && x < start + width * 2) return;
    const equivalent = start + width + (((x - start) % width) + width) % width;
    const behavior = el.style.scrollBehavior;
    const snap = el.style.scrollSnapType;
    el.style.scrollBehavior = "auto";
    el.style.scrollSnapType = "none";
    el.scrollLeft = equivalent;
    requestAnimationFrame(() => {
      el.style.scrollBehavior = behavior;
      el.style.scrollSnapType = snap;
    });
  }, [isLooping, copyWidth]);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (isLooping) {
      const overflow = el.scrollWidth > el.clientWidth + 8;
      setCanScrollLeft(overflow);
      setCanScrollRight(overflow);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(recenter, 180);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, [isLooping, recenter]);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, tiles.length]);

  // Start (and re-start) on the middle copy so both directions can loop.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isLooping) return;
    const frame = requestAnimationFrame(() => {
      const previous = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = copyWidth(el);
      el.style.scrollBehavior = previous;
      updateArrows();
    });
    return () => cancelAnimationFrame(frame);
  }, [isLooping, filteredTiles.length, copyWidth, updateArrows]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (tiles.length === 0) return null;

  const portraitWidth = {
    1: "basis-full",
    2: "basis-[calc((100%_-_0.625rem)/2)]",
    3: "basis-[calc((100%_-_1.25rem)/3)]",
  }[portraitItems];
  const landscapeWidth = {
    2: "[@media_(orientation:landscape)_and_(max-width:932px)_and_(max-height:500px)]:!basis-[calc((100%_-_0.625rem)/2)]",
    3: "[@media_(orientation:landscape)_and_(max-width:932px)_and_(max-height:500px)]:!basis-[calc((100%_-_1.25rem)/3)]",
    4: "[@media_(orientation:landscape)_and_(max-width:932px)_and_(max-height:500px)]:!basis-[calc((100%_-_1.875rem)/4)]",
  }[landscapeItems];

  return (
    <section
      id={id}
      aria-label={title}
      className={cn(
        "group/row relative mx-3 mb-2 sm:mx-5 sm:mb-3",
        "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_18px_40px_-24px_rgba(0,0,0,0.9)]",
        "py-2 sm:py-2.5"
      )}
    >
      <div className="mb-1 flex items-end justify-between gap-3 px-3 sm:px-4">
        <h2 className="text-base font-semibold tracking-wide text-white sm:text-lg">
          {title}
          <span className="ml-2 align-middle text-xs font-normal text-white/50">
            {totalCount}
          </span>
        </h2>
        {onViewAll && totalCount > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View All
          </button>
        )}
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label={`Scroll ${title} left`}
            className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/70 p-2 text-white ring-1 ring-white/20 transition-opacity hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label={`Scroll ${title} right`}
            className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/70 p-2 text-white ring-1 ring-white/20 transition-opacity hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div
          ref={scrollerRef}
          onTouchStart={() => { touching.current = true; }}
          onTouchEnd={() => {
            touching.current = false;
            if (settleTimer.current) clearTimeout(settleTimer.current);
            settleTimer.current = setTimeout(recenter, 240);
          }}
          onTouchCancel={() => { touching.current = false; }}
          className={cn(
            "flex items-start gap-2.5 overflow-x-auto scroll-smooth px-3 pb-1 pt-0.5 sm:px-4",
            "snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]",
            "[&::-webkit-scrollbar]:hidden"
          )}
        >
          {filteredTiles.length === 0 ? (
            <p className="px-1 py-6 text-sm text-white/50">No matches in {title}.</p>
          ) : (
            renderedTiles.map(({ tile, key }) => (
              <div
                key={key}
                data-tile-id={key}
                className={cn(
                  "shrink-0 snap-start",
                  portraitWidth,
                  landscapeWidth
                )}
              >
                <ShowcaseItem
                  src={tile.src}
                  alt={tile.alt}
                  caption={tile.caption}
                  srp={tile.srp}
                  isVideo={tile.isVideo}
                  aspect={aspect}
                  pageShape="original"
                  mediaAspectRatio={rowAspectRatio}
                  onDimensions={(dims) => rememberDimensions(tile.id, dims)}
                  onSelect={() => onSelect(tile.originalIndex)}
                  className={cn(
                    "!w-full",
                    searchQuery.trim() && tile.id === activeTileId &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-black"
                  )}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {onCta && ctaLabel && (
        <div className="flex justify-center px-3 pt-0.5 sm:px-4">
          <button
            type="button"
            onClick={onCta}
            className={cn(
              "inline-flex min-h-[33px] items-center justify-center rounded-full px-[18px] py-1.5",
              "bg-gradient-to-b from-amber-300 via-primary to-amber-600",
              "text-[11px] font-semibold tracking-wide text-black",
              "shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7),0_0_0_1px_hsl(var(--primary)/0.4)]",
              "transition-transform hover:scale-[1.03] active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            )}
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </section>
  );
}
