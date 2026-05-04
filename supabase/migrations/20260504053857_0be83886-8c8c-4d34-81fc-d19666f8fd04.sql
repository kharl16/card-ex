ALTER VIEW public.cards_public SET (security_invoker = off);
GRANT SELECT ON public.cards_public TO anon, authenticated;