-- Add Silver, Gold, Platinum, Jade to the global package library
INSERT INTO public.global_package_images (url, caption, sort_index, is_active, created_by)
SELECT url, caption, sort_index, true, 'a0efd175-4704-495e-a755-a18d1bd8dab8'::uuid
FROM (VALUES
  ('https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/cardex-products/a0efd175-4704-495e-a755-a18d1bd8dab8/c0be7ee2-5dc7-4a28-978d-d75da4d7cf1f/packages/a18dc2ef-2c0b-405a-9e00-8962a3d8248b.jpg', 'Silver', 3),
  ('https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/cardex-products/a0efd175-4704-495e-a755-a18d1bd8dab8/c0be7ee2-5dc7-4a28-978d-d75da4d7cf1f/packages/dba3ce4a-6b0c-4ff3-afa3-72447a5707db.jpg', 'Gold', 4),
  ('https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/cardex-products/a0efd175-4704-495e-a755-a18d1bd8dab8/c0be7ee2-5dc7-4a28-978d-d75da4d7cf1f/packages/7f596c24-6de5-4a7d-96ae-875433de650e.jpg', 'Platinum', 5),
  ('https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/cardex-products/a0efd175-4704-495e-a755-a18d1bd8dab8/c0be7ee2-5dc7-4a28-978d-d75da4d7cf1f/packages/11c215e2-45dd-47df-a625-156b0b54be20.jpg', 'Jade', 6)
) AS v(url, caption, sort_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_package_images g WHERE g.caption = v.caption
);

-- Pre-hide all newly added globals on Maria Grace Mulato's card
INSERT INTO public.card_global_package_overrides (card_id, global_package_image_id)
SELECT '3e66e43a-7f78-4c0c-9a91-1f8b4f7e2a3d'::uuid, g.id
FROM public.global_package_images g
WHERE g.caption IN ('Silver', 'Gold', 'Platinum', 'Jade')
  AND EXISTS (SELECT 1 FROM public.cards WHERE id = '3e66e43a-7f78-4c0c-9a91-1f8b4f7e2a3d'::uuid)
ON CONFLICT DO NOTHING;