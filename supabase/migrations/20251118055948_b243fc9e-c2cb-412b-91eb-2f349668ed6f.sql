-- Add carousel_enabled flag to cards table with default true
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS carousel_enabled boolean NOT NULL DEFAULT true;

-- Ensure existing cards have carousel enabled
UPDATE public.cards SET carousel_enabled = true WHERE carousel_enabled IS NULL;