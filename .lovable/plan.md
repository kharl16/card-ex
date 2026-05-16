## Goal

Make the cover photo, profile picture, and company logo render exactly like attachment #2 — the full image fits inside its placeholder with no cropping and no zoom — on every card (existing and new).

## Diagnosis

Attachment #1 (zoomed) vs attachment #2 (perfect fit) differ for two reasons:

1. **Logo still animates with Ken Burns zoom.** `RiderHeader.tsx` renders the company logo via `KenBurnsRotator`, which applies a `scale(1.0 → 1.22)` transform every cycle. Mid-animation the logo looks cropped (you only see the "N" instead of the full IAM mark).
2. **Cover/avatar respect a per-card display mode that can be `"cover"`.** `RiderHeader` already uses `objectFit: "contain"` for cover, and `avatarDisplayMode === "contain" ? "contain" : "cover"` for the avatar. But `theme.avatarDisplayMode` / `theme.logoDisplayMode` are stored per card and many existing cards were saved as `"cover"`, so they still crop/zoom on render.

## Plan

### 1. `src/components/RiderHeader.tsx`
- **Cover:** already a static `<img>` with `objectFit: "contain"` — leave as-is.
- **Avatar:** hard-code `objectFit: "contain"` (drop the `avatarDisplayMode` ternary) so the full face always shows inside the circle.
- **Logo:** replace `KenBurnsRotator` with a static `<img>` using `objectFit: "contain"`, exactly like cover/avatar. No zoom, no pan.
  - If the logo slot has multiple images, keep a simple opacity crossfade between them (no transform/scale) so rotation still works but the logo is never cropped. If you'd rather drop rotation entirely on the logo too, say so and I'll render only the first image.

### 2. `src/components/KenBurnsRotator.tsx`
- No longer used by `RiderHeader` after step 1. Leave the file in place (other surfaces may import it) but it stops affecting the card header.

### 3. Data migration (one-off)
- New SQL migration that updates all existing cards so any stored `theme.avatarDisplayMode` and `theme.logoDisplayMode` are set to `"contain"`. This makes the editor toggle reflect the new default and prevents any other surface that still reads those flags from re-cropping.
- Also refresh `card_snapshot.theme` for the same fields so published/shared views (which read from the snapshot) match.

### 4. Editor defaults (`ImagesSection.tsx`)
- Defaults are already `"contain"`. No change needed unless we decide to remove the Contain/Cover toggle entirely. Recommend keeping the toggle but defaulting (and migrating) to Contain.

## Open question

- For the logo slot when a user uploads **multiple** logos: do you want them to (a) crossfade between each other every few seconds with no zoom, or (b) just show the first logo and ignore the rest? Attachment #2 has a single static logo, so either works — let me know which you prefer before I implement.

## Files touched

- `src/components/RiderHeader.tsx` — static `<img contain>` for avatar + logo
- `supabase/migrations/<timestamp>_force_contain_display_modes.sql` — backfill `theme.avatarDisplayMode` / `logoDisplayMode` + matching `card_snapshot.theme` keys to `"contain"`

No business logic, routing, or unrelated UI is changed.
