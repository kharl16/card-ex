## Plan

1. **Confirm the damage scope**
   - The previous cleanup removed the IAM “Tag-Init aMAYzing” promo image correctly, but because many cards only had that global promo after it was auto-added, their `ad_banner` was set to empty/null.
   - I found the uploaded Ad Banner files still exist in Supabase Storage, so they can be re-linked instead of re-uploaded.

2. **Create a safe restore migration**
   - Restore Ad Banner JSON only for cards whose banner is currently empty/null and that have uploaded files under their owner’s `media/ad-banners/<user_id>/...` folder.
   - Rebuild each restored banner as:
     - `type: "image"`
     - `autoPlayMs: 4000`
     - `items: [...]` using the existing uploaded banner image URLs in upload order
   - Explicitly exclude the IAM “Tag-Init aMAYzing” promo image URL/alt text so it does **not** come back.
   - Do not touch cards that already have valid Ad Banner images.

3. **Handle owner/card ambiguity carefully**
   - Some users have more than one card, so before applying the migration I’ll scope the restore to cards that were affected by the May 31 cleanup and have matching orphaned banner files.
   - If one owner has multiple affected cards, I’ll avoid guessing unless the storage/card mapping is clear from the existing folder/user relationship.

4. **Verify after migration approval**
   - Re-count cards with banners before/after.
   - Confirm the IAM promo image remains absent.
   - Confirm restored cards have their prior banner images referenced again.

## Technical detail

The restore will be a data migration against `public.cards.ad_banner`. It will not delete or move any storage objects, and it will not change Product, Package, Testimony, Video, or card profile images.