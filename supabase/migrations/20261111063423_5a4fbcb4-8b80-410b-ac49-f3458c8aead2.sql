CREATE POLICY "No guest access to free access grants" ON public.free_access_grants
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);