# Modern Swipe/Transition Upgrade for Lightbox Carousels

Goal: make the click-to-open lightbox feel like a native iOS/Android photo gallery — finger-tracking swipes, spring physics, edge resistance, and crisp visual polish — across all 4 carousels that use `LightboxDialog`.

## What's there today
- `LightboxDialog.tsx` handles one-finger horizontal swipe → next/prev (threshold-based, no live tracking).
- Slide-in animation runs *after* index changes via CSS classes (`lightbox-slide-next/prev/in`) with a fixed duration from `useLightboxTransitionPref`.
- Two-finger = pinch zoom + pan. Preload cache warms neighbors.
- No drag-follow, no rubber-band at ends, no velocity-based commit.

## What "best-in-class" looks like
1. **Finger-tracked drag** — image follows the finger 1:1 during a one-finger horizontal drag; neighbors are visible off-screen at the edges.
2. **Spring release** — on release, decide by distance + velocity (Framer Motion-style):
   - past ~25% width OR flick velocity > 500 px/s → commit to next/prev with spring settle
   - otherwise → spring back to center
3. **Edge resistance** — at first/last image (non-loop), drag resistance grows (rubber-band, ~0.35 factor) so the boundary is felt but not blocked. Loop mode keeps free travel.
4. **Direction-aware, physically correct** — the incoming slide is always the one on the side you're pulling from; no post-hoc guess based on index diff.
5. **Neighbor preview during drag** — render prev + current + next in a translated track so the user sees the next photo appear as they pull. Uses the existing preload cache so bitmaps are already decoded.
6. **Zoom-aware gesture routing** — when `zoomLevel > 1`, one-finger drag pans within the image (today it's dead); horizontal swipe-to-navigate only fires at zoom = 1. Two-finger still = pinch + pan.
7. **Reduced-motion respect** — snap without spring when `prefers-reduced-motion: reduce`.
8. **Speed presets stay** — the Gauge popover keeps working; "Instant/Fast/Default/Smooth/Cinematic" now maps to spring stiffness, not just a CSS duration.
9. **Keyboard + arrow buttons** — animate through the same spring path so all inputs feel identical.
10. **Consistency across all 4 carousels** — `CardExCarousel`, `VideoCarousel` cover taps, `Carousel3DRing`, `ProductRingCarousel` all funnel through `LightboxDialog`, so the upgrade lands everywhere by editing one component.

## Technical approach
- Add `framer-motion` (already in the project) `motion.div` track containing `[prev, current, next]` slides, each sized to the viewport slot.
- Use `useMotionValue` for `x`; `drag="x"` with `dragElastic` per rubber-band rule; `onDragEnd` reads `offset.x` + `velocity.x` and calls `animate(x, targetX, { type: "spring", stiffness, damping })`.
- After the spring resolves on a commit, swap the index and reset `x` to 0 without animation (identity trick — no flash because the new "current" slide is already what the user was looking at).
- Preserve pinch handling by disabling `drag` when a second touch lands (`onTouchStart` sets a `pinching` flag, cleared on `touchend`).
- Map speed preset → spring config:
  - Instant: `{ stiffness: 800, damping: 60 }`
  - Fast: `{ stiffness: 500, damping: 45 }`
  - Default: `{ stiffness: 350, damping: 38 }`
  - Smooth: `{ stiffness: 220, damping: 32 }`
  - Cinematic: `{ stiffness: 140, damping: 28 }`
- Remove the current `lightbox-slide-*` CSS classes (or keep for reduced-motion fallback only).
- Keep the existing preload cache; extend to preload +2/-2 for smoother chains during fast flicks.

## Files to touch
- `src/components/LightboxDialog.tsx` — replace swipe/animate section with motion track + spring commit; route zoom-aware gestures.
- `src/hooks/useLightboxTransitionPref.ts` — extend presets to return `{ ms, spring }`.
- `src/index.css` — drop or gate slide classes behind `prefers-reduced-motion`.
- `src/lib/images/lightboxPreloadCache.ts` — small tweak to preload ±2 neighbors.

No changes to the individual carousel components — they already delegate to `LightboxDialog`.

## Out of scope
- Redesigning the toolbar, captions, or the carousel thumbnails themselves.
- Changing video lightbox (`VideoFullscreenDialog`) — separate component with its own player.
- Adding new gestures (pull-to-dismiss, double-tap-zoom) unless you want them — say the word and I'll fold them in.

## Optional add-ons (say yes/no)
- **Pull-down-to-dismiss** with backdrop fade (very iOS Photos).
- **Double-tap to zoom** at the tap point.
- **Haptic feedback** on commit (via `navigator.vibrate(8)` where supported).
