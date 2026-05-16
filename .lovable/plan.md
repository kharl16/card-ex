## Goal

Eliminate KenBurnsRotator egress from cover photos and avatars (the two biggest offenders), and keep it only on the company logo with the most aggressive savings settings.

## Changes

### 1. `src/components/RiderHeader.tsx` — drop rotator from cover & avatar

- **Cover slot**: replace `<KenBurnsRotator items={cover.items} ...>` with a single `<img>` showing only the first cover photo (or the legacy `coverUrl`). Use `cdnImage(url, { width: 1600, quality: 80 })` so it stays crisp. `loading="eager"`, `fetchpriority="high"`, `decoding="async"`. No animation, no extra fetches.
- **Avatar slot**: replace the avatar `<KenBurnsRotator>` with a single `<img>` of the first avatar photo at `cdnImage(url, { width: 240, quality: 80 })`. Keep the rotating conic-gradient ring (that's CSS, free).
- **Logo slot**: keep `<KenBurnsRotator>` but switch it into "aggressive" mode (see step 2).
- All other layout (gold pulse line, spacer, name/title) stays identical.

### 2. `src/components/KenBurnsRotator.tsx` — add aggressive lazy mode

Add two opt-in props used only by the logo slot:

- `lazyStart?: boolean` — when true, don't start the rotation interval until the component has been intersecting the viewport for ~5 seconds. Use `IntersectionObserver` + a `setTimeout` cleared on unmount/unobserve. Also pause when not intersecting.
- `preloadAhead?: number` (default 1) — only render `<img>` tags for the active slide and the next `preloadAhead` slides. Other slides render as a placeholder `<div>` until needed. This means a 5-photo logo set only fetches 2 images on first view instead of 5.

Combined effect for the logo: only 1 image fetched on first paint; the 2nd is fetched ~5 s later if the visitor is still looking; slides 3-5 only fetch if rotation actually reaches them.

### 3. `RiderHeader.tsx` logo call — pass the new props

```tsx
<KenBurnsRotator
  items={logo.items}
  autoPlayMs={logo.autoPlayMs}
  objectFit={logoDisplayMode === "contain" ? "contain" : "cover"}
  className="h-full w-full"
  altFallback={`${name || "Card"} company logo`}
  cdnWidth={160}
  lazyStart
  preloadAhead={1}
/>
```

## Out of scope

- No DB / snapshot changes. The existing `image_carousels` JSONB stays — we just stop animating cover/avatar slots on the client. Editors can still configure multiple cover/avatar photos; only the first is shown.
- No editor UI changes. (If you later want to hide the "add more cover photos" UI, that's a separate cleanup.)
- `KenBurnsRotator` itself is not deleted — it's still used for the logo and remains available if you ever want to re-enable it elsewhere.

## Expected impact

Per card view, image requests from the header drop from ~10 (5 cover + 3 avatar + 2 logo) to ~3 (1 cover + 1 avatar + 1 logo, plus +1 logo after 5 s if visitor lingers). That's roughly a **70-85 % reduction in header egress**, on top of the CDN-resize and 1-year cache work already done.

## Files touched

- `src/components/RiderHeader.tsx` (cover + avatar → static img, logo → lazyStart)
- `src/components/KenBurnsRotator.tsx` (add `lazyStart`, `preloadAhead`)
