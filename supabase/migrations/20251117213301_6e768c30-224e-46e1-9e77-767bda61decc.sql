-- Add description field to product_images for captions/overlays
ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.product_images.description IS 'Caption or description to display as overlay on carousel';