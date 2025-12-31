-- Drop the existing view
DROP VIEW IF EXISTS public.card_plans_public;

-- Recreate the view with security_invoker = true
-- This makes the view respect the RLS policies of the underlying card_plans table
CREATE VIEW public.card_plans_public 
WITH (security_invoker = true)
AS
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