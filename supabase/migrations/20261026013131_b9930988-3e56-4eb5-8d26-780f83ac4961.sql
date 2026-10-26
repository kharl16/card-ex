CREATE OR REPLACE FUNCTION public.qualify_pending_referrals() RETURNS TABLE(referral_id uuid, referrer_user_id uuid, referrer_name text, referred_user_name text, commission_amount numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF COALESCE(auth.role(),'') <> 'service_role' AND NOT COALESCE(public.is_super_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Only admins can qualify referrals' USING ERRCODE='42501'; END IF;
 RETURN QUERY WITH updated AS (
 UPDATE public.referrals r SET status='qualified', qualified_at=now(), commission_amount=COALESCE(r.commission_amount,cp.profit)
 FROM public.card_plans cp WHERE r.plan_id=cp.id AND r.status='pending' AND cp.referral_eligible=true AND EXISTS (SELECT 1 FROM public.payments p WHERE p.id=r.payment_id AND p.status='paid' AND p.created_at <= now()-interval '7 days')
 RETURNING r.id,r.referrer_user_id,r.referred_user_id,r.commission_amount)
 SELECT u.id,u.referrer_user_id,pr.full_name,pd.full_name,u.commission_amount FROM updated u LEFT JOIN public.profiles pr ON pr.id=u.referrer_user_id LEFT JOIN public.profiles pd ON pd.id=u.referred_user_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.qualify_pending_referrals() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_pending_referrals() TO authenticated,service_role;