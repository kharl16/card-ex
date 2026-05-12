UPDATE public.cards
SET image_carousels = image_carousels - 'cover',
    updated_at = now()
WHERE image_carousels ? 'cover';