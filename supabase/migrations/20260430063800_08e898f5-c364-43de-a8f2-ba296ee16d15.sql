UPDATE public.cards
SET package_images = '[]'::jsonb
WHERE package_images IS NOT NULL
  AND jsonb_array_length(package_images) > 0;