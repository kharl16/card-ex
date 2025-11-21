-- Add custom_slug field to cards table for branded short URLs
ALTER TABLE public.cards 
ADD COLUMN custom_slug text UNIQUE;

-- Add constraint to ensure custom_slug is lowercase and valid URL format
ALTER TABLE public.cards
ADD CONSTRAINT custom_slug_format CHECK (
  custom_slug IS NULL OR 
  (custom_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(custom_slug) >= 3 AND length(custom_slug) <= 50)
);

-- Add index for fast custom_slug lookups
CREATE INDEX idx_cards_custom_slug ON public.cards(custom_slug) WHERE custom_slug IS NOT NULL;

-- Update the set_card_public_url function to use custom_slug if available
CREATE OR REPLACE FUNCTION public.set_card_public_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  base_url text;
BEGIN
  SELECT value INTO base_url FROM public.app_settings WHERE key='base_url' LIMIT 1;
  IF base_url IS NULL THEN base_url := 'https://tagex.app'; END IF;

  IF NEW.slug IS NOT NULL AND EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cards' AND column_name='public_url'
  ) THEN
    -- Use custom_slug if available, otherwise use slug with /c/ prefix
    IF NEW.custom_slug IS NOT NULL AND NEW.custom_slug != '' THEN
      NEW.public_url := base_url || '/' || NEW.custom_slug;
    ELSE
      NEW.public_url := base_url || '/c/' || NEW.slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON COLUMN public.cards.custom_slug IS 'Optional custom short URL slug (e.g., "john" for tagex.app/john). Must be unique, lowercase, 3-50 chars, alphanumeric with hyphens.';