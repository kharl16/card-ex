UPDATE public.cards
SET social_links = REPLACE(social_links::text, 'https://new-grass-5279.glide.page', 'https://tagex.app')::jsonb
WHERE social_links::text ILIKE '%new-grass-5279.glide.page%';

UPDATE public.card_links
SET value = 'https://tagex.app'
WHERE value ILIKE '%new-grass-5279.glide.page%';