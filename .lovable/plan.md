## Goal
Replace the flat-looking Videos and Workspace tile backdrops with new 3D, depth-rich photographic textures that match the Locator and Resources tiles.

## Selected directions
- **Videos**: Film projector close-up — metal reels, lens flare, and light rays cutting through a dark room. Deep red cast, cinematic, volumetric depth.
- **Workspace**: Modern glass desk at night — laptop, notebook, coffee cup, and city lights reflecting in the surface. Cool blue cast, real depth and reflections.

## Implementation steps

### 1. Generate new textures
Generate two dark, moody, low-contrast photographic textures at 1024x640, saved as project assets:
- `src/assets/tiles/tile-videos.jpg` — projector close-up, deep red/crimson tint, heavy shadows, subtle light rays.
- `src/assets/tiles/tile-workspace.jpg` — glass desk night scene, cool blue/teal tint, reflections, shallow depth of field.

Both should be pre-darkened and low-contrast so the existing overlay math (opacity 0.75, scrims, accent tint) keeps text legible without extra tweaks.

### 2. Swap imports and mapping
Update `src/components/dashboard/DashboardQuadrantTiles.tsx`:
- Keep Locator and Resources backdrops unchanged.
- Replace `videosBackdrop` and `workspaceBackdrop` imports to point to the new files.
- Keep existing `objectPosition="center bottom"` and `objectFit="cover"` for the Videos tile initially; adjust after visual review if the projector base needs different anchoring.
- Leave Workspace tile at default `center` / `cover`.

### 3. Visual tuning (if needed)
After generating, review the tiles in preview. If the new projector image loses the glowing base or the desk reflections feel off, tune:
- `objectPosition` (e.g., `center 30%`, `center bottom`)
- `objectFit` only if necessary
- Avoid changing opacity/scrim values unless contrast actually fails.

### 4. Verification
Screenshot the dashboard at:
- Mobile width (375–414 px)
- Tablet width (768 px)
- Desktop width (1280+ px)

Confirm:
- Both new textures read as 3D and match Locator/Resources depth.
- Text labels, stats, and badges remain fully legible.
- No horizontal overflow.
- Pulsating borders and aura effects still render correctly above the photos.

## Out of scope
- No changes to tile layout, routing, stats, icons, or business logic.
- No changes to Locator or Resources tiles.
