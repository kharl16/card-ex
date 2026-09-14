# Company Brochure: shared library, real brochure page, and templates

Three connected pieces so the brochure you build once as admin shows up everywhere and can be applied to any card in one click.

## 1. Shared brochure pages on every card

The Company Brochure section already reads the shared library, but pages only appear when a card belongs to the same company. Fix so it works for all cards:

- Cards with no company fall back to the default company library (already partly there — make it reliable, including cards created before companies existed).
- If a card has no brochure pages of its own, the section still turns on automatically when shared pages exist, instead of staying hidden.
- Keep each owner's ability to hide individual pages, and keep every existing photo untouched.

## 2. A real brochure page

Today the library is just loose images. Add structure:

- Each brochure gets a **title**, an optional short intro, and **sections**. Each section has its own heading, optional text, and the pages (images) that belong to it.
- Pages keep their caption, so an image can carry its own line of text.
- Admin editor: create a brochure, add/rename/reorder sections, drag pages into sections, edit text inline.
- **Preview** button in the admin bar opens the brochure exactly as a visitor sees it — cover title, then each section with heading, text and its pages, tap any page to open it full screen.
- On cards, the Company Brochure section shows the brochure's sections in order instead of one flat strip of images.

## 3. Brochure templates

- Save any brochure setup as a named template in the admin (title, section text, which shared pages are included, section heading and button label used on the card).
- "Apply to card" from the admin: pick one or many cards and the brochure section is configured for them automatically.
- Applying never deletes a card's own uploaded brochure photos — it sets up the shared structure around them, and can be re-applied safely.

## Technical notes

- New tables: `global_brochures` (title, intro, company, active, sort), `global_brochure_sections` (brochure, heading, body, sort). `global_brochure_images` gains `brochure_id` and `section_id` (nullable, so current rows keep working as an unsectioned default brochure). Admin-only write policies, public read of active rows, plus explicit grants.
- New table `brochure_templates` (name, company, payload JSONB holding title/intro/sections/included page ids/card section title + CTA label). Apply writes `carousel_settings.brochure` and the card's `card_global_brochure_overrides`, leaving `brochure_images` alone.
- `src/lib/showcase.ts` gains grouped brochure sections; `ClassicShowcase` and `ImmersiveShowcase` render one row per brochure section, falling back to today's single row when no sections exist.
- New routes: `/admin/global-brochures` (extended editor), `/admin/global-brochures/preview` (visitor preview), reusing existing lightbox and showcase components.
