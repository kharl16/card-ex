-- Update activate_referral_access to use ensure_user_referral_code for consistency
CREATE OR REPLACE FUNCTION public.activate_referral_access(p_user_id uuid, p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_is_referral_eligible boolean;
  v_code text;
BEGIN
  -- Check if the plan is referral-eligible
  SELECT referral_eligible INTO plan_is_referral_eligible
  FROM card_plans WHERE id = p_plan_id;
  
  IF plan_is_referral_eligible = true THEN
    -- Use ensure_user_referral_code which never overwrites existing codes
    v_code := ensure_user_referral_code(p_user_id);
    
    -- Also update any cards owned by this user with the referral code
    UPDATE cards
    SET owner_referral_code = v_code
    WHERE user_id = p_user_id AND owner_referral_code IS NULL;
  END IF;
END;
$$;