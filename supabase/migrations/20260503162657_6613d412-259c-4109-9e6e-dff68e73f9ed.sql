
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_account_number text;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_batch_id uuid,
  ADD COLUMN IF NOT EXISTS commission_amount numeric;

CREATE TABLE IF NOT EXISTS public.referral_payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  status text NOT NULL DEFAULT 'exported',
  total_amount numeric NOT NULL DEFAULT 0,
  total_referrals integer NOT NULL DEFAULT 0,
  total_recipients integer NOT NULL DEFAULT 0,
  notes text,
  csv_filename text
);

ALTER TABLE public.referral_payout_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage payout batches" ON public.referral_payout_batches;
CREATE POLICY "Super admins manage payout batches"
  ON public.referral_payout_batches
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.qualify_pending_referrals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
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
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_referral_payout_batch(p_min_amount numeric DEFAULT 1000)
RETURNS TABLE (
  batch_id uuid,
  referrer_user_id uuid,
  referrer_name text,
  payout_method text,
  payout_account_name text,
  payout_account_number text,
  referral_count integer,
  total_amount numeric,
  referral_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
  v_total_amount numeric := 0;
  v_total_referrals integer := 0;
  v_total_recipients integer := 0;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can create payout batches';
  END IF;

  PERFORM qualify_pending_referrals();

  INSERT INTO public.referral_payout_batches (created_by, status)
  VALUES (auth.uid(), 'exported')
  RETURNING id INTO v_batch_id;

  RETURN QUERY
  WITH eligible AS (
    SELECT
      r.referrer_user_id,
      array_agg(r.id) AS ref_ids,
      count(*)::int AS ref_count,
      sum(COALESCE(r.commission_amount, 0)) AS total
    FROM public.referrals r
    WHERE r.status = 'qualified'
    GROUP BY r.referrer_user_id
    HAVING sum(COALESCE(r.commission_amount, 0)) >= p_min_amount
  ),
  marked AS (
    UPDATE public.referrals r
    SET status = 'paid_out',
        paid_out_at = now(),
        payout_batch_id = v_batch_id
    FROM eligible e
    WHERE r.id = ANY(e.ref_ids)
    RETURNING r.id
  )
  SELECT
    v_batch_id,
    e.referrer_user_id,
    p.full_name,
    p.payout_method,
    p.payout_account_name,
    p.payout_account_number,
    e.ref_count,
    e.total,
    e.ref_ids
  FROM eligible e
  LEFT JOIN public.profiles p ON p.id = e.referrer_user_id
  ORDER BY e.total DESC;

  SELECT
    COALESCE(sum(commission_amount), 0),
    count(*),
    count(DISTINCT referrer_user_id)
  INTO v_total_amount, v_total_referrals, v_total_recipients
  FROM public.referrals
  WHERE payout_batch_id = v_batch_id;

  UPDATE public.referral_payout_batches
  SET total_amount = v_total_amount,
      total_referrals = v_total_referrals,
      total_recipients = v_total_recipients
  WHERE id = v_batch_id;
END;
$$;

DROP POLICY IF EXISTS "Users update own profile payout" ON public.profiles;
CREATE POLICY "Users update own profile payout"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
