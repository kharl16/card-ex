ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE TABLE public.free_access_grants (
  user_id uuid PRIMARY KEY,
  card_id uuid,
  source text NOT NULL DEFAULT 'new_cardholder',
  granted_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz
);
GRANT SELECT ON public.free_access_grants TO authenticated;
GRANT ALL ON public.free_access_grants TO service_role;
ALTER TABLE public.free_access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own free access" ON public.free_access_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins view all free access" ON public.free_access_grants
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- Existing cardholders are not new: record them so they never get a fresh free week.
INSERT INTO public.free_access_grants (user_id, card_id, source, granted_at, ends_at)
SELECT DISTINCT ON (user_id) user_id, id, 'existing_member', now(), NULL
FROM public.cards WHERE user_id IS NOT NULL
ORDER BY user_id, created_at
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_card_free_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_ends timestamptz := now() + interval '7 days';
BEGIN
  NEW.trial_ends_at := NULL;
  IF NEW.user_id IS NULL OR COALESCE(NEW.is_paid,false) OR COALESCE(NEW.is_template,false)
     OR public.is_super_admin(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.free_access_grants (user_id, card_id, source, ends_at)
  VALUES (NEW.user_id, NEW.id, 'new_cardholder', v_ends)
  ON CONFLICT (user_id) DO NOTHING;
  IF FOUND THEN
    NEW.trial_ends_at := v_ends;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.assign_card_free_access() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ab_assign_card_free_access BEFORE INSERT ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.assign_card_free_access();

CREATE OR REPLACE FUNCTION public.protect_card_authority_fields()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 IF current_user IN ('postgres','supabase_admin','service_role') OR COALESCE(public.is_super_admin(auth.uid()),false) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.is_paid OR NEW.paid_at IS NOT NULL OR NEW.paid_overridden_by_admin OR NEW.plan_id IS NOT NULL THEN RAISE EXCEPTION 'Payment status is managed by verified payments or admins' USING ERRCODE='42501'; END IF;
 ELSE
   IF (to_jsonb(NEW) - ARRAY['updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at']) AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.is_paid IS DISTINCT FROM OLD.is_paid OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.paid_overridden_by_admin IS DISTINCT FROM OLD.paid_overridden_by_admin OR NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.referred_by_user_id IS DISTINCT FROM OLD.referred_by_user_id OR NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code OR NEW.referred_by_name IS DISTINCT FROM OLD.referred_by_name OR NEW.owner_referral_code IS DISTINCT FROM OLD.owner_referral_code OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at) THEN RAISE EXCEPTION 'Protected card fields cannot be changed by members' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.enforce_publish_account_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_published = true
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_published, false) = false) THEN
    IF NOT public.can_publish(NEW.user_id) THEN
      RAISE EXCEPTION 'Your account is not active. Please contact support to publish cards.';
    END IF;
    IF auth.uid() IS NOT NULL
       AND NOT COALESCE(NEW.is_paid, false)
       AND NOT (NEW.trial_ends_at IS NOT NULL AND NEW.trial_ends_at > now())
       AND NOT COALESCE(public.is_super_admin(auth.uid()), false)
       AND NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
      RAISE EXCEPTION 'Your free access has ended. Activate your plan to publish this card.' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_paid_member(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.cards
    WHERE user_id = _user_id
      AND (is_paid = true OR (trial_ends_at IS NOT NULL AND trial_ends_at > now()))
  );
$function$;

CREATE OR REPLACE FUNCTION public.expire_free_access_cards()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.cards SET is_published = false
  WHERE is_published = true AND COALESCE(is_paid,false) = false
    AND trial_ends_at IS NOT NULL AND trial_ends_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.expire_free_access_cards() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_card_pause_state(p_slug text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cards
    WHERE (slug = p_slug OR custom_slug = p_slug)
      AND is_published = false AND COALESCE(is_paid,false) = false
      AND trial_ends_at IS NOT NULL AND trial_ends_at <= now()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.get_card_pause_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_card_pause_state(text) TO anon, authenticated;