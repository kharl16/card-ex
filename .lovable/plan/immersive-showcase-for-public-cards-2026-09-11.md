# Immersive Showcase for Public Cards

Give every card owner a choice of how their showcase content is presented: the current carousels, or a new premium gold-and-black cinematic browsing view. Same content, two presentations. Nothing existing is deleted, moved or re-uploaded.

## What the owner gets

A new **Showcase Style** control in the card editor:

- **Classic Carousel** — exactly what cards do today (default for every existing and new card)
- **Immersive View** — cinematic hero + horizontal rows

The choice is saved on the individual card, so one card can be classic and another immersive.

A new **Company Brochure** category joins the existing four, managed the same way as Products/Packages/Testimonies (upload, caption, description, price, hide, CTA, share).

The showcase order everywhere becomes:

1. Company Brochure
2. Videos
3. Products
4. Packages
5. Testimonies

## What the visitor sees

**Classic mode:** today's carousels, in the new order.

**Immersive mode:**

```text
+--------------------------------------------------+
|  HERO  (first brochure item, cinematic fade)     |
|  Company Brochure  · title · short blurb         |
|  [ View Brochure ]                               |
+--------------------------------------------------+
  COMPANY BROCHURE                       View All >
  [img][img][img][img][img]  ->
  VIDEOS                                 View All >
  [vid][vid][vid]  ->
  PRODUCTS / PACKAGES / TESTIMONIES ...
```

- Desktop: hover lift, gold focus ring, arrow buttons on row edges, keyboard arrow/Tab navigation.
- Tablet/mobile: page scrolls vertically, each row scrolls horizontally by swipe with snap points; larger tap targets, no arrows, reduced animation.
- Tapping an item opens the existing lightbox (images) or the existing video player (videos) — same download/share behaviour as today.
- "View All" opens a responsive grid of that one category only.

## Technical notes

**Database (one migration)**
- `cards.showcase_display_mode text not null default 'carousel'` with a check constraint of `carousel | immersive`. Existing rows backfill to `carousel`, so behaviour is unchanged on deploy.
- `cards.brochure_images jsonb not null default '[]'` — same shape as the existing `product_images` / `package_images` / `testimony_images` columns.
- No existing column, table, bucket, policy, or row is touched. Existing card RLS already scopes updates to the owner/admin, so no policy changes are needed.

**Shared data layer**
- New `src/lib/showcase.ts` exports `SHOWCASE_ORDER` and `buildShowcaseCategories(card, globals)` — lifts the normalisation block currently inline in `CardView.tsx` (lines 479-535) so both presentations consume one identical array of categories. Global product/package/testimony merging and hidden-item filtering stay exactly as they are.

**Carousel settings**
- `CarouselKey` in `src/lib/carouselTypes.ts` gains `brochure`; `mergeCarouselSettings` gets a brochure default so existing stored settings keep working untouched.

**New components** (`src/components/showcase/`)
- `CardShowcase.tsx` — reads `showcase_display_mode`, renders classic or immersive
- `ClassicShowcase.tsx` — existing `CarouselSectionRenderer` / `VideoSectionRenderer` calls in the new order
- `ImmersiveShowcase.tsx`, `ShowcaseHero.tsx`, `ShowcaseRow.tsx`, `ShowcaseItem.tsx`, `ShowcaseViewAllDialog.tsx`
- Reuses `LightboxDialog` and `VideoFullscreenDialog` rather than new viewers. Images go through the existing `Img`/`ImageService` pipeline with `loading="lazy"`; rows render a windowed slice and extend on scroll for large collections.

**Editor**
- `CarouselSettingsSection.tsx`: a segmented Showcase Style control at the top, plus a Brochure tab reusing `CarouselImageUploader`.
- `showcase_display_mode` and `brochure_images` added to the autosave column whitelist in `CardEditor.tsx`, and to the card snapshot builder so preview, share and public views stay in sync.

**Untouched:** header, avatar, contact buttons, Save Contact, QR, NFC, social links, Tools, Leads, Appointments, Stats, Gallery, auth, payments, referrals, admin.

## Verification

Browser pass on desktop, tablet and mobile widths against a real card: content intact in both modes, category order correct, rows swipe and scroll, lightbox and video playback open, View All works, and switching modes changes nothing but the layout.
