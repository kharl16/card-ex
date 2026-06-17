ALTER TABLE public.cards
ADD COLUMN products_carousel_url text
GENERATED ALWAYS AS (carousel_settings #>> '{products,cta,href}') STORED;

CREATE INDEX IF NOT EXISTS idx_cards_products_carousel_url
ON public.cards (products_carousel_url)
WHERE products_carousel_url IS NOT NULL;