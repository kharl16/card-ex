-- Fix the view to use SECURITY INVOKER (querying user's permissions)
ALTER VIEW public.card_plans_public SET (security_invoker = on);