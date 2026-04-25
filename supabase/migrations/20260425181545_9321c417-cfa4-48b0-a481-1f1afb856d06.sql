-- 1. trusted_devices: devices a user has approved
CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint_hash text NOT NULL,
  device_label text,
  user_agent text,
  ip_hash text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint_hash)
);

CREATE INDEX idx_trusted_devices_user_active 
  ON public.trusted_devices(user_id) 
  WHERE revoked_at IS NULL;

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own trusted devices"
  ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users update (revoke) their own trusted devices"
  ON public.trusted_devices FOR UPDATE
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users delete their own trusted devices"
  ON public.trusted_devices FOR DELETE
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

-- Inserts go through edge functions (service role); no client INSERT policy.

-- 2. device_approval_requests: pending logins awaiting owner approval
CREATE TABLE public.device_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint_hash text NOT NULL,
  device_label text,
  user_agent text,
  ip_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  approval_token text,
  approved_by_device_id uuid REFERENCES public.trusted_devices(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dar_user_pending 
  ON public.device_approval_requests(user_id, status) 
  WHERE status = 'pending';
CREATE INDEX idx_dar_token ON public.device_approval_requests(approval_token) WHERE approval_token IS NOT NULL;

ALTER TABLE public.device_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own approval requests"
  ON public.device_approval_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users update their own approval requests"
  ON public.device_approval_requests FOR UPDATE
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

-- Inserts go through edge function (service role).

-- 3. auth_audit_log: append-only log of security events
CREATE TABLE public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'login_attempt_trusted',
    'login_attempt_new_device',
    'device_approved',
    'device_denied',
    'device_revoked',
    'first_device_otp_sent',
    'first_device_otp_verified',
    'sign_out_all_devices'
  )),
  device_fingerprint_hash text,
  device_label text,
  user_agent text,
  ip_hash text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user_created ON public.auth_audit_log(user_id, created_at DESC);

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own audit log"
  ON public.auth_audit_log FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies — only edge functions (service role) write to this table.

-- 4. Helper function: check if a device is trusted for a user
CREATE OR REPLACE FUNCTION public.is_device_trusted(_user_id uuid, _fingerprint_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trusted_devices
    WHERE user_id = _user_id
      AND device_fingerprint_hash = _fingerprint_hash
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 5. Helper: auto-expire stale approval requests (called by edge function or cron)
CREATE OR REPLACE FUNCTION public.expire_stale_approval_requests()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.device_approval_requests
  SET status = 'expired', resolved_at = now()
  WHERE status = 'pending' AND expires_at < now();
$$;