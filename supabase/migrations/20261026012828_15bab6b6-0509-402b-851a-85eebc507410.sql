CREATE OR REPLACE FUNCTION public.protect_card_authority_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('postgres','supabase_admin','service_role') OR COALESCE(public.is_super_admin(auth.uid()),false) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.is_paid OR NEW.paid_at IS NOT NULL OR NEW.paid_overridden_by_admin OR NEW.plan_id IS NOT NULL THEN RAISE EXCEPTION 'Payment status is managed by verified payments or admins' USING ERRCODE='42501'; END IF;
 ELSE
   IF (to_jsonb(NEW) - ARRAY['updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at']) AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.is_paid IS DISTINCT FROM OLD.is_paid OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.paid_overridden_by_admin IS DISTINCT FROM OLD.paid_overridden_by_admin OR NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.referred_by_user_id IS DISTINCT FROM OLD.referred_by_user_id OR NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code OR NEW.referred_by_name IS DISTINCT FROM OLD.referred_by_name OR NEW.owner_referral_code IS DISTINCT FROM OLD.owner_referral_code) THEN RAISE EXCEPTION 'Protected card fields cannot be changed by members' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_protect_card_authority_fields BEFORE INSERT OR UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.protect_card_authority_fields();
REVOKE ALL ON FUNCTION public.protect_card_authority_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_authority_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE protected text[] := ARRAY['status','company_id','has_referral_access','referral_code','referred_by_user_id','referred_by_code','referred_by_name','email_verified','signup_method','avatar_provider_id','last_login_at']; k text;
BEGIN
 IF current_user IN ('postgres','supabase_admin','service_role') OR COALESCE(public.is_super_admin(auth.uid()),false) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN RAISE EXCEPTION 'Profiles are created by the sign-up service' USING ERRCODE='42501'; END IF;
 FOREACH k IN ARRAY protected LOOP
 IF to_jsonb(NEW)->k IS DISTINCT FROM to_jsonb(OLD)->k THEN RAISE EXCEPTION 'Protected profile fields cannot be changed by members' USING ERRCODE='42501'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_protect_profile_authority_fields BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_authority_fields();
REVOKE ALL ON FUNCTION public.protect_profile_authority_fields() FROM PUBLIC, anon, authenticated;
CREATE POLICY "Only admins can write verified payments" ON public.payments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Only admins can change verified payments" ON public.payments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));