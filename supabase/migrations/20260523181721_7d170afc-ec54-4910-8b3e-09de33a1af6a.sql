INSERT INTO public.global_testimony_images (url, caption, sort_index, is_active)
SELECT DISTINCT ON (item->>'url')
  item->>'url' AS url,
  NULLIF(item->>'alt','') AS caption,
  (ROW_NUMBER() OVER (ORDER BY item->>'url')) - 1 + COALESCE((SELECT MAX(sort_index)+1 FROM public.global_testimony_images), 0) AS sort_index,
  true
FROM public.cards c,
     jsonb_array_elements(COALESCE(c.testimony_images, '[]'::jsonb)) AS item
WHERE item->>'url' IS NOT NULL
  AND item->>'url' NOT IN (SELECT url FROM public.global_testimony_images);