-- Revert cards_public view to SECURITY DEFINER so anonymous visitors can read
-- the safe public projection of published cards. The view already excludes
-- sensitive columns (payment internals, referral attribution, assessment results),
-- so column-level exposure is controlled by the view definition itself.
ALTER VIEW public.cards_public SET (security_invoker = off);