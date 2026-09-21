# Category-specific immersive carousel layout

## What will change
- Company Brochure: show 1 page at a time.
- Videos: show 1 video at a time.
- Products: show 3 photos at a time.
- Packages: show 2 photos at a time.
- Testimonies: show 2 photos at a time.
- Adjust landscape-phone counts upward only where the available width keeps each item readable and premium.
- Preserve natural image proportions, captions and prices below images, infinite looping, search, View All, and section buttons.

## Technical details
- Replace the single shared immersive-row layout with a category-specific column count.
- Calculate stable item widths from the requested visible count and row gaps.
- Keep brochure/video prominent in portrait; use denser, balanced layouts in landscape without cropping uploads.
- Verify portrait phone, landscape phone, and desktop layouts.
