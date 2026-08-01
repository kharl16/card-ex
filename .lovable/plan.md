## Goal
Replace the flat color fills behind the 4 dashboard tiles (Locator, Videos, Resources, Workspace) with subtle, content-matched photographic textures — visible but never competing with the text.

## Imagery (one per tile, dark and moody, 1024x640, generated as project assets)
- **Locator** — aerial night city grid with faint street lines, deep emerald/teal cast
- **Videos** — dark studio light streaks / soft film-grain bokeh, deep red cast
- **Resources** — close-up of stacked book edges / paper texture in shadow, warm amber cast
- **Workspace** — dark desk surface with faint blueprint grid and glassy panels, cool blue cast

Each is generated to be already low-contrast and heavily darkened at the source, so the overlay math stays simple.

## Layering per tile (bottom → top)
1. Photo texture, `object-cover`, opacity ~0.28 (intensity 3 of 5), with a left-to-right dark gradient mask so text sits on the darkest area
2. Existing color gradient wash (kept, reduced slightly so the photo reads through)
3. Existing drifting aura
4. Content + existing color-matched pulsating border (unchanged)

Text stays on `z-10` with the current contrast-hardened colors; the gradient scrim guarantees the same AA contrast as today.

## Technical notes
- New file `src/components/dashboard/TilePhotoBackdrop.tsx` renders the image layer + scrim; takes an `src` and reuses the tile's aura hue for a subtle tint.
- `DashboardQuadrantTiles.tsx` gets a `backdrop` field per tile in the existing `themes`/tiles config and renders the new layer above the base gradient.
- Images generated into `src/assets/tiles/` and imported normally; `loading="lazy"`, `decoding="async"`, `aria-hidden`, `pointer-events-none` so there is no a11y or interaction impact.
- No changes to stats, routing, or business logic.

## Verification
Screenshot the dashboard at mobile and desktop widths to confirm the textures read at intensity 3, text stays legible, and no horizontal overflow appears.
