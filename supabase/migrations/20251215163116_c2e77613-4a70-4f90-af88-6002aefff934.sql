-- Add is_template field to cards table for card type distinction
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

-- Add social_links jsonb field to store social links as JSON array
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;

-- Create index on social_links for faster queries
CREATE INDEX IF NOT EXISTS idx_cards_social_links ON public.cards USING gin(social_links);

-- Add comment for documentation
COMMENT ON COLUMN public.cards.is_template IS 'Whether this card is a template (not publishable)';
COMMENT ON COLUMN public.cards.social_links IS 'Array of social links stored as JSON: [{kind, label, url, icon}]';

-- Update the card limit check function to handle the new 2-card limit with is_template
CREATE OR REPLACE FUNCTION public.check_card_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_card_count integer;
  user_email text;
  published_count integer;
  template_count integer;
BEGIN
  -- Get user email to check if admin
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = NEW.user_id;
  
  -- Admin (kharl16@gmail.com) has no limit
  IF user_email = 'kharl16@gmail.com' THEN
    RETURN NEW;
  END IF;
  
  -- Check if user has admin role
  IF public.is_super_admin(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  
  -- Count existing cards for this user
  SELECT COUNT(*) INTO user_card_count 
  FROM public.cards 
  WHERE user_id = NEW.user_id;
  
  -- Count published and template cards separately
  SELECT 
    COUNT(*) FILTER (WHERE is_published = true AND is_template = false),
    COUNT(*) FILTER (WHERE is_template = true)
  INTO published_count, template_count
  FROM public.cards 
  WHERE user_id = NEW.user_id;
  
  -- Non-admin users can have at most 2 cards (1 published + 1 template)
  IF user_card_count >= 2 THEN
    RAISE EXCEPTION 'Card limit reached. You can only have one published card and one template card per account.';
  END IF;
  
  -- If trying to create a published card when one already exists
  IF NEW.is_published = true AND NEW.is_template = false AND published_count >= 1 THEN
    RAISE EXCEPTION 'You can only have one published card. Please unpublish your existing card first.';
  END IF;
  
  -- If trying to create a template card when one already exists
  IF NEW.is_template = true AND template_count >= 1 THEN
    RAISE EXCEPTION 'You can only have one template card. Please delete your existing template first.';
  END IF;
  
  RETURN NEW;
END;
$function$;