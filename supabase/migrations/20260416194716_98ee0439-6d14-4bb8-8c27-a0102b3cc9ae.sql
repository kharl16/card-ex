-- Backfill global_product_images from existing card product photos.
-- Pulls from card_images table AND cards.product_images JSONB.
-- Skips any URL already present in global_product_images.
WITH from_table AS (
  SELECT url, MIN(created_at) AS first_seen
  FROM card_images
  WHERE url IS NOT NULL AND url <> ''
  GROUP BY url
),
from_jsonb AS (
  SELECT
    CASE
      WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}'
      WHEN jsonb_typeof(elem) = 'object' THEN COALESCE(elem->>'url', elem->>'src')
    END AS url,
    MIN(c.created_at) AS first_seen
  FROM cards c, jsonb_array_elements(COALESCE(c.product_images, '[]'::jsonb)) elem
  WHERE jsonb_typeof(c.product_images) = 'array'
  GROUP BY 1
),
combined AS (
  SELECT url, MIN(first_seen) AS first_seen FROM (
    SELECT * FROM from_table
    UNION ALL
    SELECT * FROM from_jsonb
  ) s
  WHERE url IS NOT NULL AND url <> ''
  GROUP BY url
),
new_urls AS (
  SELECT url, first_seen
  FROM combined
  WHERE url NOT IN (SELECT url FROM global_product_images)
),
base_sort AS (
  SELECT COALESCE(MAX(sort_index), -1) AS max_sort FROM global_product_images
)
INSERT INTO global_product_images (url, caption, sort_index, is_active, created_by)
SELECT
  n.url,
  NULL,
  (SELECT max_sort FROM base_sort) + ROW_NUMBER() OVER (ORDER BY n.first_seen, n.url),
  true,
  NULL
FROM new_urls n;