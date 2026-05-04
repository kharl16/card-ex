DROP FUNCTION IF EXISTS public.qualify_pending_referrals();

CREATE OR REPLACE FUNCTION public.qualify_pending_referrals()
RETURNS TABLE(
  referral_id uuid,
  referrer_user_id uuid,
  referrer_name text,
  referred_user_name text,
  commission_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE public.referrals r
    SET status = 'qualified',
        qualified_at = now(),
        commission_amount = COALESCE(r.commission_amount, cp.profit)
    FROM public.card_plans cp
    WHERE r.plan_id = cp.id
      AND r.status = 'pending'
      AND cp.referral_eligible = true
      AND EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.id = r.payment_id
          AND p.status = 'paid'
          AND p.created_at <= now() - interval '7 days'
      )
    RETURNING r.id, r.referrer_user_id, r.referred_user_id, r.commission_amount
  )
  SELECT u.id, u.referrer_user_id, pr.full_name, pd.full_name, u.commission_amount
  FROM updated u
  LEFT JOIN public.profiles pr ON pr.id = u.referrer_user_id
  LEFT JOIN public.profiles pd ON pd.id = u.referred_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.qualify_pending_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qualify_pending_referrals() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_referral_payout_batches()
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  created_by uuid,
  created_by_name text,
  status text,
  total_amount numeric,
  total_referrals integer,
  total_recipients integer,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can view payout batches';
  END IF;

  RETURN QUERY
  SELECT b.id, b.created_at, b.created_by, p.full_name, b.status,
         b.total_amount, b.total_referrals, b.total_recipients, b.notes
  FROM public.referral_payout_batches b
  LEFT JOIN public.profiles p ON p.id = b.created_by
  ORDER BY b.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_referral_payout_batches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_referral_payout_batches() TO authenticated;