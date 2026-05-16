# Why your cached egress is high

"Cached egress" on Supabase = total bytes the Storage CDN serves to browsers (cache hits + misses). Three things in this project are amplifying it:

## Findings from your project

**1. Stored files are much larger than they need to be**
Top offenders in `cardex-products` (141 MB total, 276 files):
- Several **4.5–4.8 MB PNG** testimony/product images
- A pile of identical **877 KB PNG** product images repeated across many cards (looks like the same global product photo re-uploaded per card)
- `qrcodes` bucket: **127 MB across 1,220 PNGs**, up to 268 KB each — QR codes should be ~5–15 KB

**2. Cache lifetime is only 1 hour**
Every upload in the codebase sets `cacheControl: "3600"` (1h):
```
src/lib/uploadProcessedImage.ts
src/components/ImageUpload.tsx
src/components/ProductImageUploader.tsx
src/components/carousel/CarouselImageUploader.tsx
src/components/admin/BulkCoverReplaceTool.tsx
src/pages/admin/AdminGlobalProducts.tsx
src/pages/admin/AdminGlobalPackages.tsx
src/components/tools/admin/AdminDirectoryDialog.tsx
src/utils/vcard.ts
```
After 1h the CDN edge evicts the object and the next viewer re-downloads the full file from origin, then it's served again — so the same image gets counted toward egress repeatedly.

**3. Full-resolution originals are served everywhere**
`CardExCarousel`, `LightboxDialog`, gallery thumbs, dashboard previews and OG/share renders all load the original `getPublicUrl(...)` URL. A 200 px carousel thumb on a phone is currently downloading the same 4.8 MB PNG as the lightbox. Supabase Storage's image transformation API (`?width=…&quality=…&format=origin`) is not used anywhere.

**4. Auto-rotating carousels + popular public cards multiply views**
Each card view loads N product photos + N package photos + cover + avatar + QR. With short cache and oversize files, every public card view is multi-MB.

---

# Plan to minimize cached egress

### A. Shrink what's stored (biggest immediate win)
1. Replace upload paths to enforce **WebP + max-width 1600 px + quality 80** before upload (you already have `imageCompression.ts` and `uploadProcessedImage` does WebP — extend it to all uploaders, especially `ProductImageUploader`, `CarouselImageUploader`, `AdminGlobalProducts/Packages`, testimonies, directory).
2. One-off backfill: an admin script/edge function that downloads each object > 300 KB in `cardex-products` and `media`, re-encodes to WebP ≤ 1600 px q80, and overwrites it. Expected reduction: 141 MB → ~25–35 MB for products.
3. QR codes: regenerate as **SVG** (or 256 px PNG) instead of large PNG — drops `qrcodes` bucket from 127 MB to a few MB. SVGs also gzip to <2 KB on the wire.
4. De-duplicate the 877 KB product PNG that's stored once per card. Point those cards at the single global image row instead of re-uploading.

### B. Serve responsive sizes via Storage transforms
Wrap `getPublicUrl` in a helper `getCdnImage(url, { w, q })` that appends `?width=…&quality=…&format=origin` (Supabase image transformation). Use it in:
- `CardExCarousel` slides → `width=800`
- Carousel thumbs / dashboard tiles → `width=320`
- Avatars → `width=160`
- Lightbox → `width=1600`
- OG image fetches in `og-image` edge function → `width=1200`

This lets the CDN cache a small variant per size, so phones don't pull desktop-sized files.

### C. Lengthen cache TTL on uploads
Change `cacheControl: "3600"` → `cacheControl: "31536000"` (1 year, immutable) everywhere. Filenames are already UUID/timestamped so they're effectively immutable — long TTL is safe and dramatically cuts repeat-view egress.

A single search-replace across the 9 files listed above covers new uploads. Existing objects keep their old header until re-uploaded; the backfill in step A.2 will refresh them.

### D. Stop loading invisible images
- Add `loading="lazy"` and `decoding="async"` to non-hero `<img>`s in `CardView`, `CardExCarousel` (offscreen slides), `GalleryManager`, `ResourcesHub`, dashboard previews.
- In `CardExCarousel` Roulette mode, only mount the active ±2 slides instead of all N.
- Pause carousel auto-rotate when the tab is hidden (`document.visibilityState`) — currently it keeps cycling and pre-fetching.

### E. Cache the meta/OG edge functions harder
- `card-meta`: bump `Cache-Control` from `max-age=300` to `max-age=3600, s-maxage=86400, stale-while-revalidate=604800`.
- `og-image` is already 1 day — fine. Make sure it actually returns 304 on conditional requests (add ETag based on card `updated_at`).

### F. Monitor
After deploying A–D, watch the **Storage → Egress** chart in the Supabase dashboard for ~1 week. Expected drop: 60–85% in cached egress, mostly from steps A.1 + A.3 + B + C combined.

---

## Technical details

| Step | Files / where |
|---|---|
| Long cache TTL | 9 files listed above, `cacheControl: "31536000"` |
| `getCdnImage` helper | new `src/lib/cdnImage.ts`, used in carousels, gallery, lightbox, avatars, OG |
| Compression on upload | extend `src/lib/imageCompression.ts` usage to `ProductImageUploader.tsx`, `CarouselImageUploader.tsx`, `AdminGlobalProducts.tsx`, `AdminGlobalPackages.tsx`, testimony uploads |
| Backfill script | new edge function `optimize-storage-objects` (admin-only, batched, uses `sharp`-equivalent via `@img/sharp` or imagescript in Deno) |
| QR regen | switch `QRCodeCustomizer.tsx` / `QRCodeDisplay.tsx` save path to SVG; backfill `qrcodes` bucket |
| Lazy/visibility | `CardExCarousel.tsx`, `GalleryManager.tsx`, `CardView.tsx` |
| Edge cache headers | `supabase/functions/card-meta/index.ts` |

No DB schema changes are required. RLS policies on storage buckets stay as-is.

If you want, I can implement this in stages — I'd suggest starting with **C (long cache) + B (responsive transforms) + D (lazy loading)** since those are pure code changes with no backfill, then doing the backfill (A) once you're happy.
