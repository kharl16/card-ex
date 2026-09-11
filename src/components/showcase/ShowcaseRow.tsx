import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ShowcaseItem from "@/components/showcase/ShowcaseItem";

export interface ShowcaseRowTile {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  srp?: string;
  isVideo?: boolean;
}

interface ShowcaseRowProps {
  id?: string;
  title: string;
  tiles: ShowcaseRowTile[];
  /** Total items in the category (may exceed the tiles rendered in the row) */
  totalCount: number;
  aspect?: "portrait" | "video";
  onSelect: (index: number) => void;
  onViewAll?: () => void;
}

/**
 * A horizontally scrollable, keyboard-navigable row of showcase tiles.
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
}: ShowcaseRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    <section id={id} className="group/row relative py-3" aria-label={title}>
      <div className="mb-2 flex items-end justify-between gap-3 px-5">
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
          className={cn(
            "flex gap-2.5 overflow-x-auto scroll-smooth px-5 pb-3 pt-1 sm:gap-3",
            "snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]",
            "[&::-webkit-scrollbar]:hidden"
          )}
        >
          {tiles.map((tile, index) => (
            <ShowcaseItem
              key={tile.id}
              src={tile.src}
              alt={tile.alt}
              caption={tile.caption}
              srp={tile.srp}
              isVideo={tile.isVideo}
              aspect={aspect}
              onSelect={() => onSelect(index)}
              className="snap-start"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
