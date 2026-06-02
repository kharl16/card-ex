## Problem

Every new card created through the **Admin → Create Card** dialog automatically gets a "Showcase Item" placeholder image (the orange gradient SVG) in its Products carousel. Source: `src/components/admin/AdminCreateCardDialog.tsx`, lines 162–172, which seeds `productImages` with `/cardex/placeholders/product-gold-2.svg`.

The standard onboarding flow (`src/lib/createCardFromOnboarding.ts`) already starts with an empty Products carousel — this issue only affects admin-created cards.

## Fix

1. In `src/components/admin/AdminCreateCardDialog.tsx`, replace the seeded `productImages` array with an empty array `[]` so new admin-created cards start with no Products items (matching the onboarding behavior).
2. Remove the now-unused `substituteInItems` helper if it has no other callers in that file (will verify before deleting).

No DB migration needed — existing cards aren't touched. Only newly created cards from this dialog will be affected.

## Optional follow-up (ask before doing)

If you also want to scrub the "Showcase Item" placeholder out of cards that were previously created via this admin dialog, I can run a one-time SQL migration that removes any product item whose `url` equals `/cardex/placeholders/product-gold-2.svg`. Let me know if you want that included.