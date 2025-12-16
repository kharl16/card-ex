-- Create a view for public access that excludes sensitive business data
CREATE OR REPLACE VIEW public.card_plans_public AS
SELECT 
  id,
  code,
  name,
  description,
  retail_price,
  is_active,
  referral_eligible,
  has_reseller_access,
  created_at,
  updated_at
FROM public.card_plans
WHERE is_active = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.card_plans_public TO anon;
GRANT SELECT ON public.card_plans_public TO authenticated;

-- Drop the existing permissive public policy
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.card_plans;

-- Create new restrictive policy - only admins can see full table with wholesale/profit
CREATE POLICY "Only admins can view full plan details"
ON public.card_plans
FOR SELECT
USING (is_super_admin(auth.uid()));