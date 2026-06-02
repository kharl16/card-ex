UPDATE public.cards
SET product_images = COALESCE(
  (SELECT jsonb_agg(elem) FROM jsonb_array_elements(product_images) elem
   WHERE COALESCE(elem->>'url','') NOT LIKE '%product-gold-2.svg%'),
  '[]'::jsonb
)
WHERE product_images::text LIKE '%product-gold-2.svg%';