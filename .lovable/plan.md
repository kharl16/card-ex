## Goal
Relocate the Ads Banner from a cramped side-by-side square column to a full-width row **below** the Bio section (Option A).

## Current State
In `CardView.tsx`, the Bio and Ad Banner sit in a 2-column grid (`grid-cols-2`) with both forced to `aspect-square`. This truncates long bios and distorts the banner.

## Proposed Changes

### 1. `src/components/CardView.tsx` — Restack Bio + Banner vertically
- **Bio block**: Remove `grid-cols-2` wrapper and `aspect-square` constraint. Render it full-width with natural height so long bios expand freely.
- **Banner block**: Move it into a separate full-width row directly underneath the bio. Remove the `aspect-square` override so `AdBanner` keeps its native `aspect-video` shape.
- **Promo nudge**: Keep the "Limited Time Only!!!" arrow inside the bio block (it now points downward to the banner below).
- **Spacing**: Retain the existing `bioBannerGapMobile` / `bioBannerGapDesktop` props for the gap between bio and banner, applied to the vertical stack.

### 2. `src/components/AdBanner.tsx` — No changes needed
The banner already renders at `aspect-video` inside its glass frame. The distortion was caused by the CardView wrapper forcing it square.

## Visual Result
```
┌─────────────────────────────┐
│  Header (cover + avatar)    │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  Bio (full width)     │  │  <- expands naturally
│  │  [Read full bio]      │  │
│  │  → Limited Time Only! │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  Ad Banner            │  │  <- full width, aspect-video
│  │  (carousel or video)  │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  Carousels / Social / etc.  │
└─────────────────────────────┘
```

## Acceptance Criteria
- [ ] Bio text no longer clips or squishes into a square box.
- [ ] Ad Banner displays at its natural `16:9` aspect ratio without stretching.
- [ ] Layout remains responsive on mobile and desktop.
- [ ] No visual regressions in sections below (carousels, social links, contacts).