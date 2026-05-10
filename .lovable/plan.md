## Goal
Upgrade the Ad Banner so it can hold up to 20 images (or a single video) and turn the on-card placeholder into a swipeable, auto-playing carousel — visible in both the live card and the editor preview. The existing placeholder shape (rounded glass `aspect-video` frame) is preserved exactly, and tapping any slide opens the existing zoomable lightbox over the full set.

## Data shape
The `cards.ad_banner` JSON column today holds `{ type, url, link }`. We extend the parser to also accept a multi-image shape, while staying backward compatible with the old single-object format (no DB migration).

```ts
{
  type: "image",
  items: [{ url, link?, alt? }, ...],   // up to 20
  autoPlayMs?: number,                  // default 4000
  link?: string                         // optional global click-through fallback
}
// or
{ type: "video", url, link? }           // unchanged
```
Legacy `{ type: "image", url, link }` is auto-normalized in memory to `{ items: [{ url, link }] }`.

## Display — `src/components/AdBanner.tsx`
- **Keep the exact same outer frame**: the current `aspect-video`, `rounded-2xl`, `glass-shimmer`, gold-tinted border + glow wrapper stays as-is — it just becomes the carousel viewport.
- If `items.length > 1`: render an Embla carousel inside the frame (`embla-carousel-react` + `embla-carousel-autoplay`, both already in the project), `object-cover`, swipe/drag enabled, autoplay at `autoPlayMs`, with subtle dot indicators along the bottom and prev/next chevrons (hover on desktop, tap zones on mobile).
- If `items.length === 1`: render the single `<img>` exactly as today — no visible change.
- **Click behavior (all image cases)**: clicking any slide opens `LightboxDialog` via the existing `useLightbox` hook, seeded with **all** items and starting at the tapped index. Lightbox already supports pinch/scroll zoom, swipe between images, keyboard arrows, and download. A slide that has its own `link` (or the global `link`) is wrapped in an anchor instead — link takes precedence over lightbox, matching today's behavior.
- Video branch: unchanged.

## Editor — `src/components/editor/sections/AdBannerSection.tsx`
- Image tab becomes a multi-image manager (max 20):
  - Thumbnail grid with drag-to-reorder, per-item optional click-through link, and remove.
  - "Add image" button uploads to the existing `ad-banners` storage prefix via the same upload helper used by `ImageUpload`.
  - Small "Auto-play interval" selector (3s / 4s / 6s / Off) → `autoPlayMs`.
- Video tab unchanged.
- Global "Click-through link (optional)" stays as a fallback for slides without their own link.

## Editor preview / sync
`CardView` already passes `card.ad_banner` to `<AdBanner />`, so the editor preview, public card, and shared card all pick up the new carousel automatically with no extra wiring. `performAutosave`'s whitelist already includes `ad_banner`.

## Files to change
- `src/components/AdBanner.tsx` — multi-image Embla carousel inside the unchanged glass frame; lightbox over full set.
- `src/components/editor/sections/AdBannerSection.tsx` — multi-image manager + autoplay control.

No DB migration. No changes to `CardView`, snapshot, or autosave whitelist.

## Out of scope
- Per-image captions/descriptions (can be added later).
- Mixing images and a video in the same banner.
