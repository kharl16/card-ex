
-- Remove overly-permissive public read on share_links; replace with a code-scoped RPC.
DROP POLICY IF EXISTS share_links_public_read ON public.share_links;

CREATE OR REPLACE FUNCTION public.get_share_link_by_code(p_code text)
RETURNS TABLE(card_id uuid, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sl.card_id, sl.is_active
  FROM public.share_links sl
  WHERE sl.code = p_code
    AND sl.is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_share_link_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_share_link_by_code(text) TO anon, authenticated;
