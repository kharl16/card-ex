-- Create a secure function to get referral code for users with published cards
-- This allows public card pages to get the owner's referral code without exposing other profile data
CREATE OR REPLACE FUNCTION public.get_referral_code_for_user(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
BEGIN
  -- Only return referral code if user has at least one published card
  -- and has referral access enabled
  SELECT p.referral_code INTO v_referral_code
  FROM profiles p
  WHERE p.id = p_user_id
    AND p.has_referral_access = true
    AND p.referral_code IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM cards c 
      WHERE c.user_id = p_user_id 
      AND c.is_published = true
    );
  
  RETURN v_referral_code;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_referral_code_for_user(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referral_code_for_user(uuid) TO authenticated;