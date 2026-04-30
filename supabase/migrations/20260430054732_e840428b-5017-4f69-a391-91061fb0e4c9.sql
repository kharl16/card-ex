
-- Allow anon/public viewers to read overrides for published cards.
-- The current policy fails for anon because the inner EXISTS on `cards` is blocked
-- by the cards SELECT policy (restricted to authenticated). Use a SECURITY DEFINER
-- helper to safely check if a card is published, bypassing RLS for the lookup.

CREATE OR REPLACE FUNCTION public.is_card_published(_card_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cards WHERE id = _card_id AND is_published = true
  )
$$;

-- Replace the SELECT policies to use the helper for public access
DROP POLICY IF EXISTS "Anyone can read overrides for published cards or owner" ON public.card_global_image_overrides;
CREATE POLICY "Anyone can read overrides for published cards or owner"
ON public.card_global_image_overrides
FOR SELECT
USING (
  public.is_card_published(card_id)
  OR EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Anyone can read package overrides for published cards or owner" ON public.card_global_package_overrides;
CREATE POLICY "Anyone can read package overrides for published cards or owner"
ON public.card_global_package_overrides
FOR SELECT
USING (
  public.is_card_published(card_id)
  OR EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.user_id = auth.uid())
  OR is_super_admin(auth.uid())
);
