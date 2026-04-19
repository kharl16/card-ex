-- 1) Strip duplicates: remove any product_images entries on cards whose URL also exists in global_product_images
UPDATE public.cards
SET product_images = COALESCE((
  SELECT jsonb_agg(e)
  FROM jsonb_array_elements(product_images) e
  WHERE e ->> 'image_url' NOT IN (SELECT url FROM public.global_product_images)
), '[]'::jsonb)
WHERE jsonb_typeof(product_images) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(product_images) e
    WHERE e ->> 'image_url' IN (SELECT url FROM public.global_product_images)
  );

-- 2) Trim global product images to exactly 16 active (deactivate the rest, keep lowest sort_index first)
WITH keepers AS (
  SELECT id FROM public.global_product_images
  WHERE is_active = true
  ORDER BY sort_index ASC, created_at ASC
  LIMIT 16
)
UPDATE public.global_product_images
SET is_active = false
WHERE is_active = true
  AND id NOT IN (SELECT id FROM keepers);