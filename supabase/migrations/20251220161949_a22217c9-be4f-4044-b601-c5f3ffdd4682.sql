-- Add carousel_settings JSONB column to cards table
-- This stores all three carousel sections (products, packages, testimonies) with their settings
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS carousel_settings jsonb DEFAULT '{}'::jsonb;

-- Add a comment describing the column structure
COMMENT ON COLUMN public.cards.carousel_settings IS 'Stores carousel configuration for products, packages, and testimonies sections. Each section has images, background, settings, and CTA configuration.';