## Diagnosis

The name `Eileenita Francisco Parreno` is in the database and is being passed to `RiderHeader` correctly via `getLiveNameFromCard(card)`. Title "Branch Manager" renders below it as expected.

The issue is the H1 styling in `src/components/RiderHeader.tsx`:

```tsx
style={{
  background: `linear-gradient(135deg, ${lighterPrimary}, #ffffff)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
}}
```

For this card's theme, `primaryColor` is a light pink/magenta. `adjustHexColor(basePrimary, 50)` pushes `lighterPrimary` to near-white, so the gradient ends up white→white. The text is filled with `transparent`, and the near-white gradient over the slightly-tinted spacer area makes the text effectively unreadable — what you see in the screenshot is the faint glyph block with no contrast against the surrounding glow/cover bleed.

This is purely a presentation issue — the data and prop wiring are fine.

## Plan

Update only the H1 gradient in `src/components/RiderHeader.tsx`:

1. Replace the gradient with one that always preserves contrast against the dark card body, regardless of how light the theme primary is.
   - Use `#ffffff` → `${basePrimary}` (white to the actual brand color), instead of `lighterPrimary` → `#ffffff`. This guarantees a visible color stop on the light end and a saturated brand stop on the other.
2. Add a soft text shadow tinted with `basePrimary` at low opacity for legibility on busy cover bleed:
   - `textShadow: 0 1px 2px rgba(0,0,0,0.45), 0 0 18px ${basePrimary}33`
3. Keep `WebkitBackgroundClip: "text"` and `WebkitTextFillColor: "transparent"` as-is.
4. No changes to title styling, layout, or any other component.

## Out of scope

- No data changes, no editor changes, no theme system changes.
- No changes to `CardView.tsx`, the daily quote, or the cover image carousel.
