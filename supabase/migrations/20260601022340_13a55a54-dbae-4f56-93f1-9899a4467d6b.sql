-- Restore Ad Banner images that were inadvertently cleared by the May 31, 2026
-- "Tag-Init aMAYzing" promo cleanup migration.
--
-- Strategy:
--   * Only touch cards whose ad_banner is currently NULL.
--   * For each such card, rebuild ad_banner.items from the owner's existing
--     uploaded files in storage under media/ad-banners/<user_id>/...
--   * Exclude the IAM "Tag-Init aMAYzing" promo file so it does NOT come back.
--   * Skip when no usable files remain.

WITH storage_ads AS (
  SELECT
    o.name,
    split_part(o.name, '/', 2)::uuid AS owner_user_id,
    'https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/media/' || o.name AS public_url,
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'media'
    AND o.name LIKE 'ad-banners/%'
    -- Exclude the IAM Tag-Init aMAYzing promo so the cleanup is preserved
    AND o.name NOT ILIKE '%iam-tag-init-may-2026%'
),
items_per_owner AS (
  SELECT
    s.owner_user_id,
    jsonb_agg(
      jsonb_build_object('url', s.public_url)
      ORDER BY s.created_at
    ) AS items
  FROM storage_ads s
  GROUP BY s.owner_user_id
)
UPDATE public.cards c
SET ad_banner = jsonb_build_object(
  'type', 'image',
  'autoPlayMs', 4000,
  'items', i.items
)
FROM items_per_owner i
WHERE c.user_id = i.owner_user_id
  AND c.ad_banner IS NULL
  AND jsonb_array_length(i.items) > 0;