-- Fix mutable search_path security issue by setting explicit search_path on functions

-- Fix enforce_20_images function
CREATE OR REPLACE FUNCTION public.enforce_20_images()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF (SELECT count(*) FROM public.card_images WHERE card_id = NEW.card_id) >= 20 THEN
    RAISE EXCEPTION 'Limit is 20 images per card';
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix set_card_public_url function
CREATE OR REPLACE FUNCTION public.set_card_public_url()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = 'public'
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
    NEW.public_url := base_url || '/c/' || NEW.slug;
  END IF;

  RETURN NEW;
END;
$function$;