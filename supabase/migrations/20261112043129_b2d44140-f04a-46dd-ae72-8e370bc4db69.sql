CREATE TABLE public.free_access_email_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reminder','ended')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  recipient text,
  activate_url text,
  resend_id text,
  delivery_status text,
  delivery_checked_at timestamptz,
  error text
);
GRANT SELECT ON public.free_access_email_tests TO authenticated;
GRANT ALL ON public.free_access_email_tests TO service_role;
ALTER TABLE public.free_access_email_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins view free access email tests" ON public.free_access_email_tests
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));