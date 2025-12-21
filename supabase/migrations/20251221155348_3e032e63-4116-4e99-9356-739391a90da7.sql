-- Add 3 separate JSON columns for carousel images
-- This replaces storing images inside carousel_settings

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS product_images jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS package_images jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS testimony_images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create index for faster JSON queries if needed
CREATE INDEX IF NOT EXISTS idx_cards_product_images ON public.cards USING GIN (product_images);
CREATE INDEX IF NOT EXISTS idx_cards_package_images ON public.cards USING GIN (package_images);
CREATE INDEX IF NOT EXISTS idx_cards_testimony_images ON public.cards USING GIN (testimony_images);

-- Comment on columns
COMMENT ON COLUMN public.cards.product_images IS 'Array of product carousel images [{url, alt, order}]';
COMMENT ON COLUMN public.cards.package_images IS 'Array of package carousel images [{url, alt, order}]';
COMMENT ON COLUMN public.cards.testimony_images IS 'Array of testimony carousel images [{url, alt, order}]';