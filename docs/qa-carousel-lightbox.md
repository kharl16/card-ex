# QA Checklist — Carousel & Lightbox Image Fitting

Goal: the selected photo always displays **fully uncropped** on mobile,
tablet, and laptop, regardless of the source aspect ratio, and shows a
clean loading state until dimensions are measured.

## Test matrix

| Device  | Viewport (CSS px) |
| ------- | ----------------- |
| Mobile  | 390 × 844         |
| Tablet  | 820 × 1180        |
| Laptop  | 1440 × 900        |

Aspect ratios to cover for each device:

- Portrait tall (e.g. 1080 × 1920 phone screenshot)
- Square (1:1, e.g. testimony PNG)
- Landscape wide (e.g. 2400 × 1000 banner)
- Real testimony regression pair:
  - `Insomnia_-_Constipation.JPG`: landscape JPEG, ~1.44:1
  - `Rosacea_Skin_Disease.png`: square PNG, 1:1
- Ultra-tall infographic (≥ 3:1 height:width)
- Corrupted / broken URL (should show `Image unavailable` state, not crash)
- 60+ megapixel image (should show error state, not blow up layout)

## Steps per case

1. Open a published card that contains the target image in the carousel.
2. Verify carousel slide: aspect-ratio wrapper renders with skeleton,
   then image fades in with `object-contain` — **no cropping**, no layout jump.
3. Tap/click the image to open the lightbox.
4. Verify lightbox:
   - Skeleton is visible until the image reports its natural dimensions.
   - Wrapper adopts the measured aspect ratio; image fills the wrapper
     with `object-contain` — the full photo is visible with no crop.
   - Both `95vw − 4rem` and `95vh − 4rem` caps apply, so nothing overflows.
5. Zoom in / out — the transform still respects the wrapper; captions
   and counter remain readable.
6. Corrupted / oversized case: the error tile ("Image unavailable") is
   shown; no console errors or infinite spinners.

## Pass criteria

- No cropping in the carousel or lightbox across every viewport × ratio.
- Skeleton visible only briefly; no flash of wrong aspect ratio.
- Broken and oversized images degrade to a clean error tile.
- No horizontal scroll introduced at any viewport.

## Regression note

Supabase image transforms must include both `width` and `height` with
`resize=contain` for testimony previews and lightbox images. Width-only
transforms can return incorrect intrinsic dimensions for large square PNG
testimonies, causing the selected preview to use the wrong wrapper ratio.
