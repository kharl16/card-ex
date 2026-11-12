CREATE POLICY "No guest access to free access email tests" ON public.free_access_email_tests
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);