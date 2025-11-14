-- Add share_url column to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS share_url text;

-- Create function to generate share URL
CREATE OR REPLACE FUNCTION public.generate_share_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate share_url based on slug
  NEW.share_url = 'https://card-ex.lovable.app/c/' || NEW.slug;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate share_url on insert/update
DROP TRIGGER IF EXISTS generate_share_url_trigger ON public.cards;
CREATE TRIGGER generate_share_url_trigger
  BEFORE INSERT OR UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_share_url();

-- Update existing cards with share_url
UPDATE public.cards 
SET share_url = 'https://card-ex.lovable.app/c/' || slug 
WHERE share_url IS NULL;

-- Create index on share_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_cards_share_url ON public.cards(share_url);