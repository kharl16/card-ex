-- Make cards_public view bypass base-table RLS so anonymous visitors
-- can read published cards via the safe column subset.
ALTER VIEW public.cards_public SET (security_invoker = false);

-- Ensure anon and authenticated roles can read the view
GRANT SELECT ON public.cards_public TO anon, authenticated;