Goal: Make the dashboard quadrant tiles feel premium and alive by adding a subtle, always-on colored smoke/aura effect behind each icon, while keeping text/icons readable and preserving the existing hover/focus interactions.

### What will change
1. **New `TileAuraBackground` component** (`src/components/dashboard/TileAuraBackground.tsx`)
   - Renders 3 absolutely-positioned, heavily blurred radial blobs per tile.
   - Each blob uses the tile's accent color at low opacity (e.g., emerald/rose/amber/gold).
   - Blobs drift in independent CSS keyframe loops so the effect feels like slow smoke.
   - Respects `prefers-reduced-motion` by disabling movement.

2. **CSS keyframes** added to `src/index.css` (or `tailwind.config.ts` if more appropriate)
   - `tile-aura-drift-a/b/c`: slow translate/scale loops (8–14s) using only `transform` and `opacity` for GPU-friendly animation.
   - Reduced-motion media query pauses the drift.

3. **Update `src/components/dashboard/DashboardQuadrantTiles.tsx`**
   - Add a static base gradient wash per tile (e.g., `bg-gradient-to-br from-<accent>/10 to-transparent`) so tiles are not bland at rest.
   - Place `<TileAuraBackground />` behind the icon ring and label with `z-0`/`z-10` layering.
   - Keep the existing icon colors, glow, hover scale/border, focus ring, and label truncation exactly as they are.
   - The "More" popover behavior remains unchanged.

4. **Verify visually**
   - Capture a Playwright screenshot of `/dashboard` at the current mobile viewport to confirm the smoke stays behind content and nothing wraps/crops.
   - Run the project's typecheck/build to ensure no regressions.

### Out of scope
- No Supabase/schema changes.
- No changes to navigation, stats dialog, or the "More" menu contents.
- No new npm dependencies (pure CSS + React component).