UPDATE public.cards SET product_images = '[]'::jsonb WHERE jsonb_array_length(COALESCE(product_images,'[]'::jsonb)) > 0;
DELETE FROM public.card_images;