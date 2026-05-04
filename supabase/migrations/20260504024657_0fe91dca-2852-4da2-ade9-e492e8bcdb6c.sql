-- 1) Fix Security Definer View (cards_public) to security_invoker
ALTER VIEW public.cards_public SET (security_invoker = on);

-- 2) Lock down internal SECURITY DEFINER functions from anonymous callers.
-- These are called only by triggers, edge functions (service role bypasses checks), or admin code paths.
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.process_card_payment(uuid,uuid,uuid,numeric,text,text,text,boolean)',
    'public.activate_referral_access(uuid,uuid)',
    'public.ensure_user_referral_code(uuid)',
    'public.generate_referral_code()',
    'public.cleanup_old_rate_limits()',
    'public.expire_stale_approval_requests()',
    'public.increment_analytics_daily(uuid,date,text,text)',
    'public.qualify_pending_referrals()',
    'public.create_referral_payout_batch(numeric)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
  END LOOP;
END $$;

-- Keep authenticated execute access for the two admin RPCs (admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.qualify_pending_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_referral_payout_batch(numeric) TO authenticated;