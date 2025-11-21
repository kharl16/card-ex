-- Update the generate_share_url function to use tagex.app domain
CREATE OR REPLACE FUNCTION public.generate_share_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate share_url based on slug using tagex.app domain
  NEW.share_url = 'https://tagex.app/c/' || NEW.slug;
  RETURN NEW;
END;
$function$;

-- Update all existing cards to use tagex.app domain in share_url
UPDATE public.cards
SET share_url = 'https://tagex.app/c/' || slug
WHERE share_url IS NULL 
   OR share_url LIKE '%card-ex.lovable.app%'
   OR share_url LIKE '%lovableproject.com%';

-- Also ensure public_url uses tagex.app for any existing cards
UPDATE public.cards
SET public_url = CASE 
  WHEN custom_slug IS NOT NULL AND custom_slug != '' 
    THEN 'https://tagex.app/' || custom_slug
  ELSE 'https://tagex.app/c/' || slug
END
WHERE public_url IS NULL
   OR public_url LIKE '%card-ex.lovable.app%'
   OR public_url LIKE '%lovableproject.com%';