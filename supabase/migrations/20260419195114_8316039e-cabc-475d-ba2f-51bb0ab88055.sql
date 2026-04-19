-- Step 1: Insert any IAM Template images that aren't yet in global_product_images
WITH iam_imgs AS (
  SELECT 
    (e->>'url')                AS url,
    NULLIF(e->>'alt','')       AS caption,
    COALESCE((e->>'order')::int, 0) AS sort_index
  FROM public.cards c, jsonb_array_elements(c.product_images) e
  WHERE c.id = '9734e74a-221a-4214-82dd-2bd371c1d4d6'
    AND e->>'url' IS NOT NULL
)
INSERT INTO public.global_product_images (url, caption, sort_index, is_active)
SELECT i.url, i.caption, i.sort_index, true
FROM iam_imgs i
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_product_images g WHERE g.url = i.url
);

-- Step 2: Re-activate + refresh caption/sort for IAM Template URLs that already existed
WITH iam_imgs AS (
  SELECT 
    (e->>'url')                AS url,
    NULLIF(e->>'alt','')       AS caption,
    COALESCE((e->>'order')::int, 0) AS sort_index
  FROM public.cards c, jsonb_array_elements(c.product_images) e
  WHERE c.id = '9734e74a-221a-4214-82dd-2bd371c1d4d6'
    AND e->>'url' IS NOT NULL
)
UPDATE public.global_product_images g
SET is_active  = true,
    caption    = i.caption,
    sort_index = i.sort_index,
    updated_at = now()
FROM iam_imgs i
WHERE g.url = i.url;

-- Step 3: Deactivate every global image NOT in the IAM Template set
WITH iam_urls AS (
  SELECT DISTINCT e->>'url' AS url
  FROM public.cards c, jsonb_array_elements(c.product_images) e
  WHERE c.id = '9734e74a-221a-4214-82dd-2bd371c1d4d6'
    AND e->>'url' IS NOT NULL
)
UPDATE public.global_product_images
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND url NOT IN (SELECT url FROM iam_urls);

-- Step 4: Strip per-card product_images entries that now duplicate active globals
-- (Handles both legacy {image_url,...} and new {url,alt,order} shapes.
--  IAM Template card excluded so it remains the source of truth.)
UPDATE public.cards
SET product_images = COALESCE((
  SELECT jsonb_agg(e)
  FROM jsonb_array_elements(product_images) e
  WHERE COALESCE(e->>'url', e->>'image_url') NOT IN (
    SELECT url FROM public.global_product_images WHERE is_active
  )
), '[]'::jsonb)
WHERE jsonb_typeof(product_images) = 'array'
  AND id <> '9734e74a-221a-4214-82dd-2bd371c1d4d6'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(product_images) e
    WHERE COALESCE(e->>'url', e->>'image_url') IN (
      SELECT url FROM public.global_product_images WHERE is_active
    )
  );