import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ShowcaseItem from "@/components/showcase/ShowcaseItem";
import CarouselSearchBar from "@/components/carousel/CarouselSearchBar";

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
  aspect?: "portrait" | "video";
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
}: ShowcaseRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchOrdinal, setActiveMatchOrdinal] = useState(0);

  const filteredTiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tiles;
    return tiles.filter((t) =>
      [t.alt, t.caption, t.srp].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [tiles, searchQuery]);

  const matchCount = searchQuery.trim() ? filteredTiles.length : 0;

  useEffect(() => {
    if (activeMatchOrdinal >= filteredTiles.length) setActiveMatchOrdinal(0);
  }, [filteredTiles.length, activeMatchOrdinal]);

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

  const handleSearchPrev = useCallback(() => {
    if (matchCount === 0) return;
    setActiveMatchOrdinal((o) => {
      const next = (o - 1 + matchCount) % matchCount;
      jumpToMatch(next);
      return next;
    });
  }, [matchCount, jumpToMatch]);

  const handleSearchNext = useCallback(() => {
    if (matchCount === 0) return;
    setActiveMatchOrdinal((o) => {
      const next = (o + 1) % matchCount;
      jumpToMatch(next);
      return next;
    });
  }, [matchCount, jumpToMatch]);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, tiles.length]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (tiles.length === 0) return null;

  return (
    <section
      id={id}
      aria-label={title}
      className={cn(
        "group/row relative mx-3 mb-4 sm:mx-5 sm:mb-6",
        "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_18px_40px_-24px_rgba(0,0,0,0.9)]",
        "py-3 sm:py-4"
      )}
    >
      <div className="mb-2 flex items-end justify-between gap-3 px-4 sm:px-5">
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

      {tiles.length > 1 && (
        <div className="mb-2 px-4 sm:px-5">
          <CarouselSearchBar
            query={searchQuery}
            onQueryChange={(q) => {
              setSearchQuery(q);
              setActiveMatchOrdinal(0);
            }}
            matchCount={matchCount}
            currentMatch={matchCount === 0 ? 0 : activeMatchOrdinal + 1}
            onPrev={handleSearchPrev}
            onNext={handleSearchNext}
            placeholder={`Search ${title.toLowerCase()}...`}
          />
        </div>
      )}

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
          className={cn(
            "flex gap-2.5 overflow-x-auto scroll-smooth px-4 pb-2 pt-1 sm:gap-3 sm:px-5",
            "snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]",
            "[&::-webkit-scrollbar]:hidden"
          )}
        >
          {filteredTiles.length === 0 ? (
            <p className="px-1 py-6 text-sm text-white/50">No matches in {title}.</p>
          ) : (
            filteredTiles.map((tile, index) => (
              <div key={tile.id} data-tile-id={tile.id} className="snap-start">
                <ShowcaseItem
                  src={tile.src}
                  alt={tile.alt}
                  caption={tile.caption}
                  srp={tile.srp}
                  isVideo={tile.isVideo}
                  aspect={aspect}
                  onSelect={() => onSelect(tile.originalIndex)}
                  className={cn(
                    searchQuery.trim() &&
                      index === activeMatchOrdinal &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-black"
                  )}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {onCta && ctaLabel && (
        <div className="flex justify-center px-4 pt-1 sm:px-5">
          <button
            type="button"
            onClick={onCta}
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-2",
              "bg-gradient-to-b from-amber-300 via-primary to-amber-600",
              "text-sm font-semibold tracking-wide text-black",
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
