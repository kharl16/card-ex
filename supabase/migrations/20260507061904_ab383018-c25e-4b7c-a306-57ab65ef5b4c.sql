CREATE OR REPLACE FUNCTION public.get_card_referral_stats(p_card_id uuid)
RETURNS TABLE(paid_out_count integer, paid_out_amount numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE r.status = 'paid_out'), 0)::int AS paid_out_count,
    COALESCE(SUM(COALESCE(r.commission_amount, cp.profit, 0)) FILTER (WHERE r.status = 'paid_out'), 0)::numeric AS paid_out_amount
  FROM public.cards c
  LEFT JOIN public.referrals r ON r.referrer_user_id = c.user_id
  LEFT JOIN public.card_plans cp ON cp.id = r.plan_id
  WHERE c.id = p_card_id AND c.is_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_card_referral_stats(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_referral_stats(p_user_id uuid)
RETURNS TABLE(paid_out_count integer, paid_out_amount numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE r.status = 'paid_out'), 0)::int,
    COALESCE(SUM(COALESCE(r.commission_amount, cp.profit, 0)) FILTER (WHERE r.status = 'paid_out'), 0)::numeric
  FROM public.referrals r
  LEFT JOIN public.card_plans cp ON cp.id = r.plan_id
  WHERE r.referrer_user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) TO authenticated;