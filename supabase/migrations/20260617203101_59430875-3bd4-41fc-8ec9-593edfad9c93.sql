ALTER TABLE public.cards
ADD COLUMN products_carousel_url_digits text
GENERATED ALWAYS AS (
  right(regexp_replace(carousel_settings #>> '{products,cta,href}', '[^0-9]', '', 'g'), 8)
) STORED;

CREATE INDEX IF NOT EXISTS idx_cards_products_carousel_url_digits
ON public.cards (products_carousel_url_digits)
WHERE products_carousel_url_digits IS NOT NULL;