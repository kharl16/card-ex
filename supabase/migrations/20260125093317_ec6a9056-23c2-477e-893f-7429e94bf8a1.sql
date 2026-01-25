-- Create a validation function for referrals
CREATE OR REPLACE FUNCTION public.validate_referral_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_referred_super_admin BOOLEAN;
  referred_user_referrer UUID;
BEGIN
  -- Check if referred user is a super admin
  SELECT public.is_super_admin(NEW.referred_user_id) INTO is_referred_super_admin;
  
  IF is_referred_super_admin THEN
    RAISE EXCEPTION 'Cannot create referral record for super admin users';
  END IF;
  
  -- Check if referred user has a referred_by_user_id in their profile
  SELECT referred_by_user_id INTO referred_user_referrer
  FROM public.profiles
  WHERE id = NEW.referred_user_id;
  
  IF referred_user_referrer IS NULL THEN
    RAISE EXCEPTION 'Cannot create referral record for user without a referrer in their profile';
  END IF;
  
  -- Ensure the referrer matches the profile's referred_by_user_id
  IF referred_user_referrer != NEW.referrer_user_id THEN
    RAISE EXCEPTION 'Referrer mismatch: referral record referrer must match the user profile referred_by_user_id';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on referrals table
DROP TRIGGER IF EXISTS validate_referral_before_insert ON public.referrals;
CREATE TRIGGER validate_referral_before_insert
  BEFORE INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_referral_record();