-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active','inactive','suspended','pending_verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS card_ex_id text UNIQUE DEFAULT ('CX-' || upper(substring(md5(random()::text) from 1 for 8))),
  ADD COLUMN IF NOT EXISTS status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verification_date timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS signup_method text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS avatar_provider_id text;

UPDATE public.profiles SET card_ex_id = 'CX-' || upper(substring(md5(random()::text || id::text) from 1 for 8))
WHERE card_ex_id IS NULL;

-- 3. auth_logs
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address text,
  browser text,
  operating_system text,
  country text,
  signup_time timestamptz,
  login_time timestamptz,
  auth_provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auth_logs TO authenticated;
GRANT ALL ON public.auth_logs TO service_role;

ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read auth logs" ON public.auth_logs;
CREATE POLICY "Admins can read auth logs"
ON public.auth_logs FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read own auth logs" ON public.auth_logs;
CREATE POLICY "Users can read own auth logs"
ON public.auth_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS auth_logs_user_id_idx ON public.auth_logs(user_id);
CREATE INDEX IF NOT EXISTS auth_logs_created_at_idx ON public.auth_logs(created_at DESC);

-- 4. Permanent super admin (email pinned)
CREATE OR REPLACE FUNCTION public.is_permanent_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id AND lower(u.email) = 'kharl16@gmail.com'
  );
$$;

-- Super admin check now also honours the permanent super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.is_permanent_super_admin(_user_id);
$$;

-- 5. Account status helpers
CREATE OR REPLACE FUNCTION public.get_account_status(_user_id uuid)
RETURNS public.account_status
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT status FROM public.profiles WHERE id = _user_id), 'active'::public.account_status);
$$;

CREATE OR REPLACE FUNCTION public.can_publish(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.get_account_status(_user_id) = 'active'::public.account_status;
$$;

-- 6. Block publishing for inactive/suspended accounts
CREATE OR REPLACE FUNCTION public.enforce_publish_account_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.is_published = true
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_published, false) = false)
     AND NOT public.can_publish(NEW.user_id) THEN
    RAISE EXCEPTION 'Your account is not active. Please contact support to publish cards.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_publish_account_status ON public.cards;
CREATE TRIGGER trg_enforce_publish_account_status
BEFORE INSERT OR UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_account_status();