
-- Clear per-card product_images on every card EXCEPT the IAM Template,
-- so only the 16 active global product images are shown across cards.
UPDATE public.cards
SET product_images = '[]'::jsonb
WHERE id <> '9734e74a-221a-4214-82dd-2bd371c1d4d6'
  AND jsonb_typeof(product_images) = 'array'
  AND jsonb_array_length(product_images) > 0;
