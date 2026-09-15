# Brochure page shape across admin, editor, and public cards

Add one consistent brochure page-shape setting with three choices: **Portrait**, **Landscape**, and **Original**. The selected shape will be visible in the Global Brochure Photos library, configurable per card, and used by the actual published card.

## What will change

### Global Brochure Photos
- Add a clearly labeled three-option page-shape control near the brochure title and intro.
- Save the company-wide default on the brochure record.
- Update the page thumbnails and admin preview immediately so administrators see the selected shape while arranging pages.

### Card editor
- Add the same Portrait / Landscape / Original control inside **Carousel Settings → Brochure → Behavior**.
- A card-specific selection overrides the company-wide default; cards without an override inherit the global setting.
- Keep all existing carousel settings, photos, sections, hidden-page choices, and display modes unchanged.

### Actual card
- Apply the resolved brochure shape in both Classic Carousel and Immersive showcase modes:
  - **Portrait:** premium editorial page proportions.
  - **Landscape:** wide presentation proportions.
  - **Original:** preserves each image’s natural proportions without cropping.
- Use contained images, refined framing, subtle gold/glass detailing, stable sizing, and responsive spacing so brochure artwork remains legible and polished on mobile and desktop.
- Keep videos, products, packages, and testimonies unchanged.

### Templates and preview
- Include page shape when saving and applying a brochure template.
- Make the dedicated brochure preview read the saved global shape by default while retaining its live shape switcher.

## Technical details
- Add a nullable `page_shape` field to `global_brochures`, validated to `portrait`, `landscape`, or `original`, with explicit Data API grants unchanged and existing RLS preserved.
- Add `pageShape` to the brochure carousel settings and template payload. Resolution order: card setting → global brochure setting → `portrait` fallback for backward compatibility.
- Thread the resolved shape through the shared brochure hook, showcase category builder, Classic renderer, Immersive rows, view-all tiles, and carousel image stage.
- Validate the editor preview and actual card at mobile and desktop sizes, including both showcase styles and all three shapes.
