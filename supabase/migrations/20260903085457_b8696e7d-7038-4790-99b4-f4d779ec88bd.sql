CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text,
  email_hash text,
  email_domain text,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_attempts TO service_role;

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can review signup attempts"
ON public.signup_attempts
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip ON public.signup_attempts (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_email ON public.signup_attempts (email_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_created ON public.signup_attempts (created_at);

CREATE OR REPLACE FUNCTION public.cleanup_old_signup_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.signup_attempts WHERE created_at < now() - interval '7 days';
$$;