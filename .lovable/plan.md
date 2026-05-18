## Goal
Add a Search field to every image carousel (Products, Packages, Testimonies). Typing filters/jumps to matching slides; clicking a match opens the lightbox while keeping the search active.

## UX
- **Placement**: full-width row directly below the title + Share/Download row, inside `CarouselSectionRenderer`'s header area (before the carousel container). Search bar follows the dark-luxury glassmorphism style (subtle border, gold focus ring), with a leading magnifier icon and a clear (×) button.
- **Match scope**: each item's `alt` + `description` + `srp` (case-insensitive substring).
- **Behavior (Highlight + Jump)**:
  - As the user types, compute the list of matching indices.
  - Auto-scroll/rotate the carousel so the first match is centered (works for roulette, ring3D, and flat modes).
  - Matching slides get a gold ring/glow + small "match N/M" badge; non-matches dim to ~40% opacity (no removal — layout stays stable).
  - Prev/Next match arrows appear next to the input to jump between matches.
  - Empty query = normal state.
- **On click of a match**: opens the existing lightbox at that index; on close, the search query persists so the user can keep browsing matches.

## Architecture

```text
CarouselSectionRenderer
 ├─ Header row (title + CarouselShareHeader)
 ├─ NEW: <CarouselSearchBar query setQuery matchCount currentMatch onPrev onNext />
 └─ CardExCarousel
       ├─ receives: searchQuery, matchedIndices, activeMatchIndex
       ├─ RouletteMode / FlatMode / Ring3DMode
       │    └─ each slide: applies "matched" / "dimmed" classes + auto-focuses activeMatchIndex
       └─ Lightbox (existing) — opened on slide click; search state lives in parent so it survives close
```

### New file
- `src/components/carousel/CarouselSearchBar.tsx` — input + match counter + prev/next buttons, glassmorphism styling.

### Edited files
- `src/components/carousel/CarouselSectionRenderer.tsx`
  - Add `searchQuery` state and `matchedIndices` memo from `carouselItems` (`alt|description|srp`).
  - Track `activeMatchIndex` (0..matchedIndices.length-1) with Prev/Next handlers.
  - Render `<CarouselSearchBar />` below the header.
  - Pass `searchQuery`, `matchedIndices`, `activeMatchIndex` into `CardExCarousel`.
- `src/components/CardExCarousel.tsx`
  - Accept new props and forward to `RouletteMode` and `FlatMode`.
  - When `activeMatchIndex` changes, programmatically scroll/center that slide (use existing scroll-into-view logic; for roulette pause auto-rotate while a query is active).
  - Per-slide classes: `data-matched`, `data-dimmed` → Tailwind classes for ring + opacity.
- `src/components/Carousel3DRing.tsx`
  - Same prop wiring; rotate ring so the matched index is at the front; dim others.

### State persistence on lightbox close
- Search state lives in `CarouselSectionRenderer`, not inside the lightbox. Opening/closing the lightbox does not reset it. Lightbox `onClose` only resets zoom (existing behavior).

## Out of scope
- No backend changes, no new DB columns. Pure client-side filtering over already-loaded items.
- No global cross-carousel search — each carousel has its own independent bar.
- No fuzzy search/typo tolerance in v1 (plain `.toLowerCase().includes()`); easy to swap to Fuse.js later if needed.

## Edge cases
- Carousels with 0 items: search bar hidden (same condition as `shouldRender`).
- No matches: input shows "0 / 0" and a subtle "No matches" hint; carousel returns to normal (no dimming) so the user isn't staring at a faded carousel.
- Hidden images (`img.hidden`) remain excluded from search just as they are from display.