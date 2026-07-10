
# Optimize Image Handling — TagEx / Card-Ex

Goal: minimize Supabase Storage Image Transformation calls (and egress) at scale by (a) uploading a single already-optimized original per image, (b) always requesting one of a small set of fixed transformation URLs, and (c) never re-fetching a larger variant just to zoom.

The work is split into 4 phases so it can be reviewed and merged incrementally without breaking existing cards.

---

## Phase 1 — Foundation: `ImageService` + presets (no visual change)

Create the single source of truth every component will consume.

**New files**

- `src/lib/images/presets.ts` — declares the only allowed upload + transform sizes.
  - `UPLOAD_PRESETS`: `avatar 600²`, `logo 600²`, `cover 1920×1080`, `product|package|testimony|branch|carousel 1600²`.
  - `RENDER_PRESETS`: `avatar 300²`, `logo 300²`, `cover 1600×900`, `carousel|product|package|testimony|branch 1200²`, `adminThumb 150²`, `lightbox: "original"` (no transform).
  - Every value is a `const` object; TypeScript `ImageKind` union enforces "no arbitrary sizes".
- `src/lib/images/ImageService.ts` — the only public API used by components:
  - `getRenderUrl(url, kind, variant?)` → deterministic transformed URL (WebP by default, `format=origin` for PNG-with-transparency).
  - `getSrcSet(url, kind)` → optional `srcset` composed **only** from preset widths (e.g. `1x`/`2x` of the same preset), never arbitrary widths.
  - `getOriginalUrl(url)` → for download / edit / lightbox only.
  - `<Img />` React component (memoized) wrapping `<img>` with `loading="lazy"`, `decoding="async"`, mandatory `width`/`height`, `fetchpriority` prop, and preset-derived `src`/`srcset`.
- `src/lib/images/optimizeForUpload.ts` — browser-side pipeline:
  - Decode via `createImageBitmap` (drops EXIF automatically), resize to the preset max keeping aspect ratio, encode WebP at q=0.82 with JPEG q=0.82 fallback, keep PNG only if source has an alpha channel.
  - Returns `{ blob, mime, width, height, previewUrl }`.
  - Hard-reject if final blob still exceeds a per-kind byte cap.

**Edits**

- `src/lib/cdnImage.ts` — keep as internal helper called by `ImageService`; mark exported `cdnImage` as `@deprecated` so future call sites are caught in review. No runtime behavior change.
- `src/lib/uploadProcessedImage.ts` — accept the pre-optimized blob from `optimizeForUpload` (already the case), but enforce `contentType` from the blob (webp/jpeg/png) instead of hardcoding webp.

No component changes yet — Phase 1 ships behind the scenes and existing pages keep working.

---

## Phase 2 — Route all uploads through `optimizeForUpload`

Replace the ad-hoc compression/upload logic in every uploader so nothing raw ever hits Storage.

**Edits (one PR-sized batch)**

- `src/components/ImageUpload.tsx` — swap `compressImage` for `optimizeForUpload(kind)`; render preview from the returned `previewUrl` (object URL), upload only on Save.
- `src/components/editor/RotatingPhotoSlot.tsx` — pass `kind` (`avatar` | `logo` | `cover`) through to `ImageUpload`.
- `src/components/carousel/CarouselImageUploader.tsx` — kind = `carousel`.
- `src/components/ProductImageUploader.tsx`, `ProductImageManager.tsx` — kind = `product`.
- `src/components/GalleryManager.tsx` — kind = `product`; also runs URL-imported images through the pipeline via a `fetch → Blob → optimizeForUpload` step.
- Admin bulk tools (`admin/BulkCoverReplaceTool.tsx`, `admin/resources/BulkUploadDialog.tsx`, `AdminGlobalProducts/Packages/Testimonies.tsx`, `tools/admin/AdminDirectoryDialog.tsx`) — same, with the matching kind.
- Reject-on-oversize surfaces a toast with the preset limit; no silent server-side resize.

Editing flow (requirement §9) is preserved: previews are object URLs, upload happens only on Save.

---

## Phase 3 — Route all rendering through `ImageService`

Sweep every `<img>` / `background-image` that currently builds its own URL.

**Edits**

- `src/components/CardView.tsx`, `CardExCarousel.tsx`, `KenBurnsRotator.tsx`, `RiderHeader.tsx`, `SpotlightStage.tsx`, `SafeImage.tsx`, `ProductRingCarousel.tsx`, `Carousel3DRing.tsx` — replace direct `<img src={...}>` / `cdnImage(...)` calls with `<Img kind="..." variant="..." />`.
- `src/components/LightboxDialog.tsx` — reuse the **already-loaded** preview URL (requirement §7). Zoom/pan uses CSS `transform` only; no new network request. Only "Download original" hits `getOriginalUrl`.
- `src/components/resources/*`, `DirectoryCard.tsx`, `AmbassadorCard.tsx`, `templates/TemplateGallery.tsx`, admin lists — use `kind="adminThumb"` / `kind="carousel"` as appropriate.
- Add `<link rel="preload" as="image" fetchpriority="high">` for the LCP avatar/cover on `PublicCard.tsx` and `SharedCard.tsx`, using the same preset URL the card renders — guarantees CardView ↔ PublicCard URL identity (requirement §8).
- Enable virtualization on the big lists via `@tanstack/react-virtual` (already suitable for React 18):
  - `AdminCards.tsx`, `TemplateGallery.tsx`, `DirectoryPage.tsx`, `ProductImageManager` grids.

Grep gate: after this phase, `rg "cdnImage\("` should return zero hits outside `src/lib/images/`.

---

## Phase 4 — Storage hygiene + caching + duplication safety

- **Cache headers**: set `cacheControl: "31536000, immutable"` on every `storage.upload(...)` (uploads use content-hash filenames so immutability is safe).
- **Content-hash filenames**: `optimizeForUpload` computes a SHA-256 of the output blob; upload path becomes `<kind>/<hash>.<ext>` and uploads use `upsert: true`. Identical bytes → identical object → zero duplicate storage.
- **Duplicate-card flow**: `DuplicateCardDialog.tsx` / `createCardFromOnboarding.ts` already copy URL strings — audit to guarantee we never re-upload; add a unit test.
- **Orphan cleanup**: add `supabase/functions/storage-gc/index.ts` (scheduled) that lists objects in `media` / `card-images` / `cardex-products` and deletes any not referenced by `cards`, `card_images`, `global_*_images`, `directory_entries`. Dry-run flag first; opt-in via env.
- **No cache-busting query params anywhere** — remove any `?t=${Date.now()}` we find in the sweep.

---

## Technical notes

- **Preset table (single source of truth)**

  ```text
  kind        upload max        render default   admin thumb   lightbox
  avatar      600 x 600         300 x 300        150 x 150     original
  logo        600 x 600         300 x 300        150 x 150     original
  cover       1920 x 1080       1600 x 900       —             original
  carousel    1600 x 1600       1200 x 1200      —             original (already loaded)
  product     1600 x 1600       1200 x 1200      150 x 150     original
  package     1600 x 1600       1200 x 1200      150 x 150     original
  testimony   1600 x 1600       1200 x 1200      150 x 150     original
  branch      1600 x 1600       1200 x 1200      150 x 150     original
  ```

- WebP served via Supabase `render/image/public?...&format=webp`, PNG-with-alpha detected via canvas alpha sample and kept as `format=origin`.
- `srcset` only ever contains 1× and 2× of the same preset (e.g. `avatar 300 + 600`), so the CDN sees at most 2 URLs per image per kind.
- No responsive width negotiation (requirement §12) — CSS handles layout scaling.
- Lightbox zoom uses CSS `transform: scale()` + pointer/gesture handlers; the underlying `<img>` src is unchanged.
- Type gate: `getRenderUrl` accepts only `(kind, variant)` from the preset union — attempts to pass a numeric width won't compile.

## Out of scope (ask before doing)

- Migrating existing already-uploaded originals to the new preset caps (would require a one-shot backfill job).
- Replacing the Supabase transform CDN with an external image service (Cloudflare Images, imgix, etc.).
- Changing bucket layout or renaming buckets.

## Rollout order

1. Phase 1 merges silently — zero visual diff, easy to revert.
2. Phase 2 flips uploads; existing images keep serving from their current URLs.
3. Phase 3 sweeps render sites; measure Supabase transformation calls before/after.
4. Phase 4 turns on immutable caching + orphan GC.
