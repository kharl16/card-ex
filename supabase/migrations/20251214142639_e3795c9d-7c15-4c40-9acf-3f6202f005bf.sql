-- Update the handle_new_user function to also process referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referral_code_input text;
  referrer_id uuid;
BEGIN
  -- Insert base profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  -- Check for referral code in metadata
  referral_code_input := new.raw_user_meta_data->>'referral_code';
  
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    -- Look up the referrer by their referral_code
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = referral_code_input;
    
    -- If found, update the new user's profile with the referrer
    IF referrer_id IS NOT NULL THEN
      UPDATE public.profiles
      SET referred_by_user_id = referrer_id
      WHERE id = new.id;
    END IF;
  END IF;
  
  RETURN new;
END;
$$;