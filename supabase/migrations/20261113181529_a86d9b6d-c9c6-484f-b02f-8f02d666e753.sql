-- Record PayMongo payments (the webhook writes 'PAYMONGO', which the old rule rejected)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method = ANY (ARRAY['GCASH','MAYA','QRPH','PH_BANK','INTL_CARD','INTL_BANK','CASH','ADMIN_OVERRIDE','PAYMONGO']));

-- ── GCash receiving details (single row, managed by super admins) ──
CREATE TABLE public.gcash_payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  account_name text NOT NULL DEFAULT '' CHECK (char_length(account_name) <= 120),
  gcash_number text NOT NULL DEFAULT '' CHECK (gcash_number = '' OR gcash_number ~ '^09[0-9]{9}$'),
  qr_image_url text CHECK (qr_image_url IS NULL OR qr_image_url ~ '^https://'),
  instructions text CHECK (instructions IS NULL OR char_length(instructions) <= 1000),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gcash_settings_complete_when_enabled CHECK (NOT enabled OR (account_name <> '' AND gcash_number <> ''))
);
GRANT SELECT, INSERT, UPDATE ON public.gcash_payment_settings TO authenticated;
GRANT ALL ON public.gcash_payment_settings TO service_role;
ALTER TABLE public.gcash_payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exclude guest sessions" ON public.gcash_payment_settings AS RESTRICTIVE FOR ALL TO authenticated
  USING (COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  WITH CHECK (COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Signed-in members read GCash details" ON public.gcash_payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins add GCash details" ON public.gcash_payment_settings FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins change GCash details" ON public.gcash_payment_settings FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER update_gcash_payment_settings_updated_at BEFORE UPDATE ON public.gcash_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.gcash_payment_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ── Member GCash payment submissions awaiting review ──
CREATE TABLE public.gcash_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.card_plans(id),
  amount numeric NOT NULL,
  reference_number text NOT NULL CHECK (reference_number ~ '^[0-9]{10,16}$'),
  sender_number text NOT NULL CHECK (sender_number ~ '^09[0-9]{9}$'),
  sender_name text CHECK (sender_name IS NULL OR char_length(sender_name) BETWEEN 1 AND 120),
  proof_path text CHECK (proof_path IS NULL OR char_length(proof_path) <= 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  reviewed_by uuid,
  reviewed_at timestamptz,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX gcash_submissions_reference_unique ON public.gcash_payment_submissions (reference_number) WHERE status <> 'rejected';
CREATE UNIQUE INDEX gcash_submissions_one_pending_per_card ON public.gcash_payment_submissions (card_id) WHERE status = 'pending';
CREATE INDEX gcash_submissions_status_created ON public.gcash_payment_submissions (status, created_at DESC);
CREATE INDEX gcash_submissions_user ON public.gcash_payment_submissions (user_id);

GRANT SELECT, INSERT ON public.gcash_payment_submissions TO authenticated;
GRANT ALL ON public.gcash_payment_submissions TO service_role;
ALTER TABLE public.gcash_payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exclude guest sessions" ON public.gcash_payment_submissions AS RESTRICTIVE FOR ALL TO authenticated
  USING (COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  WITH CHECK (COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Members submit their own GCash payments" ON public.gcash_payment_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members see their own GCash payments" ON public.gcash_payment_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER update_gcash_payment_submissions_updated_at BEFORE UPDATE ON public.gcash_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server decides the amount and review fields; members can only pay for their own unpaid card
CREATE OR REPLACE FUNCTION public.prepare_gcash_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card record;
  v_plan record;
  v_settings record;
BEGIN
  SELECT * INTO v_settings FROM gcash_payment_settings WHERE id = true;
  IF NOT COALESCE(v_settings.enabled, false) THEN
    RAISE EXCEPTION 'GCash payments are not available right now' USING ERRCODE = '42501';
  END IF;

  SELECT id, user_id, is_paid, COALESCE(is_template, false) AS is_template INTO v_card FROM cards WHERE id = NEW.card_id;
  IF NOT FOUND OR v_card.user_id IS DISTINCT FROM NEW.user_id OR v_card.is_template THEN
    RAISE EXCEPTION 'You can only pay for your own card' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(v_card.is_paid, false) THEN
    RAISE EXCEPTION 'This card is already paid' USING ERRCODE = '23514';
  END IF;

  SELECT id, retail_price, is_active INTO v_plan FROM card_plans WHERE id = NEW.plan_id;
  IF NOT FOUND OR NOT v_plan.is_active THEN
    RAISE EXCEPTION 'Please choose an available plan' USING ERRCODE = '23514';
  END IF;

  IF NEW.proof_path IS NOT NULL AND NEW.proof_path NOT LIKE NEW.user_id::text || '/%' THEN
    RAISE EXCEPTION 'Invalid screenshot' USING ERRCODE = '42501';
  END IF;

  NEW.amount := v_plan.retail_price;
  NEW.status := 'pending';
  NEW.review_note := NULL;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.payment_id := NULL;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER prepare_gcash_submission BEFORE INSERT ON public.gcash_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.prepare_gcash_submission();
REVOKE EXECUTE ON FUNCTION public.prepare_gcash_submission() FROM PUBLIC, anon, authenticated;

-- Super admin approves (activates card + referral) or rejects (with reason)
CREATE OR REPLACE FUNCTION public.review_gcash_payment(_submission_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record;
  v_plan record;
  v_payment uuid;
  v_referrer uuid;
  v_existing record;
  v_note text := NULLIF(btrim(COALESCE(_note, '')), '');
BEGIN
  IF NOT COALESCE(public.is_super_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Only super admins can review GCash payments' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO s FROM gcash_payment_submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'This payment was already reviewed' USING ERRCODE = '23514'; END IF;

  IF NOT _approve THEN
    IF v_note IS NULL THEN RAISE EXCEPTION 'Please give the member a reason' USING ERRCODE = '23514'; END IF;
    UPDATE gcash_payment_submissions
      SET status = 'rejected', review_note = left(v_note, 500), reviewed_by = auth.uid(), reviewed_at = now()
      WHERE id = s.id;
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM cards WHERE id = s.card_id AND is_paid) THEN
    RAISE EXCEPTION 'This card is already paid' USING ERRCODE = '23514';
  END IF;

  v_payment := public.process_card_payment(s.card_id, s.user_id, s.plan_id, s.amount, 'GCASH', s.reference_number, s.proof_path, false);

  -- Referral credit, same rules as the existing manual payment flow
  SELECT referral_eligible, code INTO v_plan FROM card_plans WHERE id = s.plan_id;
  IF v_plan.referral_eligible AND lower(v_plan.code) <> 'personal' THEN
    SELECT COALESCE(c.referred_by_user_id, p.referred_by_user_id) INTO v_referrer
      FROM cards c LEFT JOIN profiles p ON p.id = c.user_id WHERE c.id = s.card_id;
    IF v_referrer IS NOT NULL AND v_referrer <> s.user_id THEN
      SELECT id, referrer_user_id, status INTO v_existing FROM referrals WHERE referred_user_id = s.user_id LIMIT 1;
      IF NOT FOUND THEN
        INSERT INTO referrals (referrer_user_id, referred_user_id, referred_card_id, payment_id, plan_id, status)
        VALUES (v_referrer, s.user_id, s.card_id, v_payment, s.plan_id, 'pending');
      ELSIF v_existing.status = 'pending' THEN
        UPDATE referrals SET referrer_user_id = v_referrer, referred_card_id = s.card_id, payment_id = v_payment, plan_id = s.plan_id
          WHERE id = v_existing.id;
      END IF;
    END IF;
  END IF;

  -- Put the card back online if it was taken down after the free week (keeps the one-published-card rule)
  BEGIN
    UPDATE cards SET is_published = true
      WHERE id = s.card_id AND NOT COALESCE(is_published, false)
        AND NOT EXISTS (SELECT 1 FROM cards o WHERE o.user_id = s.user_id AND o.id <> s.card_id AND o.is_published);
  EXCEPTION WHEN others THEN
    NULL;
  END;

  UPDATE gcash_payment_submissions
    SET status = 'approved', payment_id = v_payment, review_note = v_note, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = s.id;
  RETURN v_payment;
END $$;
REVOKE EXECUTE ON FUNCTION public.review_gcash_payment(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_gcash_payment(uuid, boolean, text) TO authenticated;

-- ── Private bucket for payment screenshots ──
CREATE POLICY "Members upload own GCash screenshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gcash-proofs' AND (storage.foldername(name))[1] = auth.uid()::text
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Members and super admins view GCash screenshots" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gcash-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_super_admin(auth.uid()))
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Super admins remove GCash screenshots" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gcash-proofs' AND public.is_super_admin(auth.uid()));