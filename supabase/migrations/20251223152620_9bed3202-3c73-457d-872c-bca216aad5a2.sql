-- ========================================
-- PERMANENT REFERRAL CODE SYSTEM
-- ========================================

-- 1) Add UNIQUE constraint on profiles.referral_code (if not present)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_referral_code_key;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);

-- 2) Add columns to cards table for referral visibility
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS owner_referral_code TEXT,
ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
ADD COLUMN IF NOT EXISTS referred_by_name TEXT,
ADD COLUMN IF NOT EXISTS referred_by_user_id UUID;

-- 3) Add columns to profiles for referral attribution (if not present)
-- (referred_by_user_id already exists per schema, add referred_by_code/name for easy access)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

-- 4) Create ensure_user_referral_code function (returns existing or generates new - NEVER overwrites)
CREATE OR REPLACE FUNCTION public.ensure_user_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- First check if user already has a referral code
  SELECT referral_code INTO existing_code
  FROM profiles
  WHERE id = p_user_id;
  
  -- If code exists, just return it (NEVER overwrite)
  IF existing_code IS NOT NULL AND existing_code != '' THEN
    -- Ensure has_referral_access is true
    UPDATE profiles
    SET has_referral_access = true
    WHERE id = p_user_id AND has_referral_access = false;
    
    RETURN existing_code;
  END IF;
  
  -- Generate new unique code
  LOOP
    new_code := 'CEX-' || upper(substring(md5(random()::text) from 1 for 6));
    
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Update profile with new code and access
  UPDATE profiles
  SET 
    referral_code = new_code,
    has_referral_access = true
  WHERE id = p_user_id;
  
  RETURN new_code;
END;
$$;

-- 5) Create trigger function to auto-ensure referral code when card is paid+published
CREATE OR REPLACE FUNCTION public.ensure_referral_on_card_paid_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code TEXT;
  v_referred_by_code TEXT;
  v_referred_by_name TEXT;
  v_referred_by_user_id UUID;
BEGIN
  -- Only proceed if card is both paid AND published
  IF NEW.is_paid = true AND NEW.is_published = true THEN
    -- Ensure the card owner has a referral code (generates if missing, returns existing if present)
    v_referral_code := ensure_user_referral_code(NEW.user_id);
    
    -- Update the card's owner_referral_code
    NEW.owner_referral_code := v_referral_code;
  END IF;
  
  -- On INSERT, copy referred_by data from profiles to cards (if not already set)
  IF TG_OP = 'INSERT' THEN
    -- Get referral attribution from profile
    SELECT 
      p.referred_by_code,
      p.referred_by_name,
      p.referred_by_user_id
    INTO 
      v_referred_by_code,
      v_referred_by_name,
      v_referred_by_user_id
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    -- Copy to card if not already set
    IF NEW.referred_by_code IS NULL THEN
      NEW.referred_by_code := v_referred_by_code;
    END IF;
    IF NEW.referred_by_name IS NULL THEN
      NEW.referred_by_name := v_referred_by_name;
    END IF;
    IF NEW.referred_by_user_id IS NULL THEN
      NEW.referred_by_user_id := v_referred_by_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6) Drop existing trigger if present and create new one
DROP TRIGGER IF EXISTS trigger_ensure_referral_on_card ON public.cards;

CREATE TRIGGER trigger_ensure_referral_on_card
  BEFORE INSERT OR UPDATE OF is_paid, is_published
  ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_referral_on_card_paid_published();

-- 7) Update handle_new_user to capture referral attribution (fix disappearing code issue)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referral_code_input TEXT;
  referrer_record RECORD;
BEGIN
  -- Insert base profile (without touching referral_code - let it stay null until earned)
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  -- Check for referral code in metadata
  referral_code_input := new.raw_user_meta_data->>'referral_code';
  
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    -- Look up the referrer by their referral_code
    SELECT id, full_name, referral_code
    INTO referrer_record
    FROM public.profiles
    WHERE referral_code = referral_code_input;
    
    -- If found, update the new user's profile with referrer info
    IF referrer_record IS NOT NULL THEN
      UPDATE public.profiles
      SET 
        referred_by_user_id = referrer_record.id,
        referred_by_code = referrer_record.referral_code,
        referred_by_name = referrer_record.full_name
      WHERE id = new.id;
    END IF;
  END IF;
  
  RETURN new;
END;
$$;

-- 8) Backfill: Update existing cards with owner_referral_code where profiles have one
UPDATE public.cards c
SET owner_referral_code = p.referral_code
FROM public.profiles p
WHERE c.user_id = p.id
  AND p.referral_code IS NOT NULL
  AND c.owner_referral_code IS NULL;

-- 9) Backfill: Generate referral codes for existing paid+published cards
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
BEGIN
  FOR r IN 
    SELECT DISTINCT c.id, c.user_id
    FROM public.cards c
    LEFT JOIN public.profiles p ON c.user_id = p.id
    WHERE c.is_paid = true 
      AND c.is_published = true
      AND (p.referral_code IS NULL OR p.referral_code = '')
  LOOP
    -- Ensure referral code for this user
    v_code := public.ensure_user_referral_code(r.user_id);
    
    -- Update the card's owner_referral_code
    UPDATE public.cards
    SET owner_referral_code = v_code
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 10) Backfill: Copy referred_by data from profiles to cards
UPDATE public.cards c
SET 
  referred_by_code = p.referred_by_code,
  referred_by_name = p.referred_by_name,
  referred_by_user_id = p.referred_by_user_id
FROM public.profiles p
WHERE c.user_id = p.id
  AND p.referred_by_user_id IS NOT NULL
  AND c.referred_by_user_id IS NULL;

-- 11) Backfill: For existing referrals table, copy referral attribution to profiles/cards
DO $$
DECLARE
  r RECORD;
  v_referrer_code TEXT;
  v_referrer_name TEXT;
BEGIN
  FOR r IN 
    SELECT 
      ref.referred_user_id,
      ref.referrer_user_id
    FROM public.referrals ref
    WHERE ref.referrer_user_id IS NOT NULL
  LOOP
    -- Get referrer info
    SELECT referral_code, full_name 
    INTO v_referrer_code, v_referrer_name
    FROM public.profiles
    WHERE id = r.referrer_user_id;
    
    -- Update profile if not already set
    UPDATE public.profiles
    SET 
      referred_by_code = COALESCE(referred_by_code, v_referrer_code),
      referred_by_name = COALESCE(referred_by_name, v_referrer_name),
      referred_by_user_id = COALESCE(referred_by_user_id, r.referrer_user_id)
    WHERE id = r.referred_user_id
      AND referred_by_user_id IS NULL;
    
    -- Update cards if not already set
    UPDATE public.cards
    SET 
      referred_by_code = COALESCE(referred_by_code, v_referrer_code),
      referred_by_name = COALESCE(referred_by_name, v_referrer_name),
      referred_by_user_id = COALESCE(referred_by_user_id, r.referrer_user_id)
    WHERE user_id = r.referred_user_id
      AND referred_by_user_id IS NULL;
  END LOOP;
END;
$$;