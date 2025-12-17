-- Add product_images JSONB column to cards table
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS product_images jsonb DEFAULT '[]'::jsonb;

-- Migrate existing data from product_images table into cards.product_images
UPDATE cards c
SET product_images = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'image_url', p.image_url,
        'alt_text', p.alt_text,
        'description', p.description,
        'sort_order', p.sort_order
      )
      ORDER BY p.sort_order NULLS LAST, p.created_at
    )
    FROM product_images p
    WHERE p.card_id = c.id
  ),
  '[]'::jsonb
);

-- Add index for better query performance on the JSONB column
CREATE INDEX IF NOT EXISTS idx_cards_product_images ON cards USING gin(product_images);

-- Note: The product_images table is NOT dropped - keeping for safety/backup
-- The app will stop reading/writing to it after this migration