-- Add card_type column to support 2-card limit (publishable + transferable)
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS card_type text DEFAULT 'publishable' 
CHECK (card_type IN ('publishable', 'transferable'));

-- Create index for faster queries on user card counts
CREATE INDEX IF NOT EXISTS idx_cards_user_id_card_type ON public.cards(user_id, card_type);

-- Create a function to check card limits before insert
CREATE OR REPLACE FUNCTION public.check_card_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_card_count integer;
  user_email text;
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
  
  -- Non-admin users can have at most 2 cards
  IF user_card_count >= 2 THEN
    RAISE EXCEPTION 'Card limit reached. Non-admin users can only have 2 cards (1 publishable + 1 transferable). Please delete an existing card or contact admin.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for card limit check
DROP TRIGGER IF EXISTS check_card_limit_trigger ON public.cards;
CREATE TRIGGER check_card_limit_trigger
  BEFORE INSERT ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.check_card_limit();