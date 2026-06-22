-- Restore public read access to published cards.
-- The cards_public view is security_invoker=true (per prior security fix),
-- so anonymous/authenticated callers need an RLS policy on the base cards table
-- to read published rows. Per project policy, exposing published card fields publicly is intentional.

DROP POLICY IF EXISTS "Public can view published cards" ON public.cards;

CREATE POLICY "Public can view published cards"
ON public.cards
FOR SELECT
TO anon, authenticated
USING (is_published = true);

GRANT SELECT ON public.cards TO anon;