import React from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  matchCount: number;
  currentMatch: number; // 1-based for display; 0 when no match
  onPrev: () => void;
  onNext: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * Search field for a single carousel. Highlights + jumps to matches
 * (matching logic + jump effect handled by the parent).
 */
export default function CarouselSearchBar({
  query,
  onQueryChange,
  matchCount,
  currentMatch,
  onPrev,
  onNext,
  placeholder = "Search...",
  className,
}: CarouselSearchBarProps) {
  const hasQuery = query.trim().length > 0;
  const hasMatches = matchCount > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full rounded-full border border-primary/25",
        "bg-background/40 backdrop-blur-md px-3 py-1.5",
        "focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30 transition-colors",
        className
      )}
    >
      <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search images in carousel"
        className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />

      {hasQuery && (
        <>
          {hasMatches ? (
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
              {currentMatch}/{matchCount}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-destructive whitespace-nowrap">
              No matches
            </span>
          )}

          {hasMatches && matchCount > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous match"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-primary/15 text-foreground/80 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next match"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-primary/15 text-foreground/80 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-primary/15 text-foreground/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
