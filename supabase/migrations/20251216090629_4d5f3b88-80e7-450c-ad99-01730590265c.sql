-- Update policy: authenticated users can see full plans, only anon is restricted
DROP POLICY IF EXISTS "Only admins can view full plan details" ON public.card_plans;

-- Allow authenticated users to view active plans (they need profit for referral info)
CREATE POLICY "Authenticated users can view active plans"
ON public.card_plans
FOR SELECT
USING (
  (is_active = true AND auth.role() = 'authenticated')
  OR is_super_admin(auth.uid())
);