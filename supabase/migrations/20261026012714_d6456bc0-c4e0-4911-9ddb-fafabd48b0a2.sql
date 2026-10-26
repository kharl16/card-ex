ALTER VIEW public.cards_public SET (security_invoker = true);

DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity LOOP
 EXECUTE format('CREATE POLICY "Exclude guest sessions" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (COALESCE((auth.jwt()->>''is_anonymous'')::boolean,false) = false) WITH CHECK (COALESCE((auth.jwt()->>''is_anonymous'')::boolean,false) = false)',t.relname);
 END LOOP;
END $$;

ALTER POLICY "Users can create templates" ON public.card_templates WITH CHECK (auth.uid() = owner_id AND (public.is_super_admin(auth.uid()) OR (visibility IN ('private','team') AND is_global = false)));
ALTER POLICY "Users can update their own templates" ON public.card_templates WITH CHECK (auth.uid() = owner_id AND (public.is_super_admin(auth.uid()) OR (visibility IN ('private','team') AND is_global = false)));
ALTER POLICY "Anyone can create appointments" ON public.card_appointments WITH CHECK (status = 'pending' AND length(trim(visitor_name)) BETWEEN 1 AND 100 AND length(visitor_email) <= 255 AND visitor_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.is_published = true AND c.user_id = owner_user_id));

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.prorettype='trigger'::regtype OR p.proname IN ('process_card_payment','activate_referral_access','cleanup_old_rate_limits','cleanup_old_signup_attempts','expire_stale_approval_requests','increment_analytics_daily','qualify_pending_referrals')) LOOP
 EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_user_referral_code(p_user_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing_code text; new_code text;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' AND COALESCE(auth.role(),'') <> 'service_role' AND session_user <> 'postgres' AND NOT COALESCE(public.is_super_admin(auth.uid()),false) THEN
   IF NOT EXISTS (SELECT 1 FROM public.cards c JOIN public.card_plans cp ON cp.id=c.plan_id WHERE c.user_id=p_user_id AND c.is_paid AND cp.referral_eligible AND lower(cp.code) <> 'personal') OR auth.uid() IS DISTINCT FROM p_user_id THEN
     RAISE EXCEPTION 'Referral access requires a verified eligible payment' USING ERRCODE='42501';
   END IF;
 END IF;
 SELECT referral_code INTO existing_code FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF existing_code IS NOT NULL AND existing_code <> '' THEN RETURN existing_code; END IF;
 LOOP
 new_code := 'CEX-' || upper(substring(md5(random()::text) FROM 1 FOR 6));
 EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code=new_code);
 END LOOP;
 UPDATE public.profiles SET referral_code=new_code, has_referral_access=true WHERE id=p_user_id;
 RETURN new_code;
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_user_referral_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_referral_code(uuid) TO authenticated, service_role;