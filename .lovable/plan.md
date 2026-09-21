# Consistent one-photo carousel rows

## What will change
- Make Products, Packages, Videos, and Testimonies use the same one-photo-at-a-time row treatment as Company Brochure in portrait phone and regular narrow layouts.
- On landscape phones, show a premium two-item layout, allowing three only when the available width comfortably supports it.
- Size each image frame from the uploaded image's natural aspect ratio, using `object-contain` so images are never cropped or stretched.
- Keep price and caption areas below the image and outside the image frame.
- Preserve infinite looping, search, View All, calls to action, lightbox/video opening, and all existing content.

## Technical details
- Generalize the immersive row's current brochure-only large-tile mode to every category.
- Add responsive landscape-phone sizing without changing tablet/desktop behavior beyond the requested consistent presentation.
- Reuse each tile's measured intrinsic dimensions to set its image area and stabilize loading with a safe fallback ratio.
- Verify portrait phone, landscape phone, and desktop layouts, including looping and caption/price separation.
