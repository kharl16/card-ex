-- =====================================================
-- CARD-EX PRICING, PAYMENT & REFERRAL SYSTEM
-- =====================================================

-- 1. Create card_plans table
CREATE TABLE public.card_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  retail_price numeric(10,2) NOT NULL,
  wholesale_price numeric(10,2) NOT NULL,
  profit numeric(10,2) NOT NULL,
  referral_eligible boolean NOT NULL DEFAULT true,
  has_reseller_access boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on card_plans
ALTER TABLE public.card_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans
CREATE POLICY "Anyone can view active plans"
ON public.card_plans FOR SELECT
USING (is_active = true OR public.is_super_admin(auth.uid()));

-- Only admins can manage plans
CREATE POLICY "Admins can manage plans"
ON public.card_plans FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger for updated_at on card_plans
CREATE TRIGGER update_card_plans_updated_at
  BEFORE UPDATE ON public.card_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed card_plans with the 6 products
INSERT INTO public.card_plans (code, name, description, retail_price, wholesale_price, profit, referral_eligible, has_reseller_access) VALUES
  ('PERSONAL', 'Card-Ex Personal', 'Digital QR only (No reseller access)', 399.00, 0.00, 0.00, false, false),
  ('ESSENTIAL', 'Card-Ex Essential', 'Digital QR + Tools + Carousel + Reseller Access', 599.00, 299.00, 300.00, true, true),
  ('CARBON', 'Card-Ex Carbon', 'Digital QR + PVC NFC (Plain Carbon Card)', 999.00, 499.00, 500.00, true, true),
  ('SIGNATURE', 'Card-Ex Signature', 'Digital QR + Personalized PVC NFC', 1499.00, 749.00, 750.00, true, true),
  ('ELITE_FRODO', 'Card-Ex Elite (Frodo)', 'NFC Ring + Carbon NFC Card', 2499.00, 1249.00, 1250.00, true, true),
  ('ELITE_PRO_SAURON', 'Card-Ex Elite Pro (Sauron)', 'Ring + Carbon NFC + 4 QR Passes', 3999.00, 1999.00, 2000.00, true, true);

-- 3. Add payment/status fields to cards table
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.card_plans(id),
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_overridden_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

-- 4. Add referral fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS has_referral_access boolean NOT NULL DEFAULT false;

-- 5. Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.card_plans(id),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PHP',
  payment_method text NOT NULL CHECK (payment_method IN ('GCASH', 'MAYA', 'QRPH', 'PH_BANK', 'INTL_CARD', 'INTL_BANK', 'CASH', 'ADMIN_OVERRIDE')),
  provider_reference text,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Users can insert payments for their own cards
CREATE POLICY "Users can insert own payments"
ON public.payments FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Only admins can update payments
CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger for updated_at on payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.card_plans(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid_out', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view referrals where they are involved
CREATE POLICY "Users can view own referrals"
ON public.referrals FOR SELECT
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Only admins/server can insert referrals
CREATE POLICY "Admins can manage referrals"
ON public.referrals FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 7. Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate CEX- followed by 6 random uppercase alphanumeric characters
    new_code := 'CEX-' || upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- 8. Function to activate referral access after payment
CREATE OR REPLACE FUNCTION public.activate_referral_access(p_user_id uuid, p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_is_referral_eligible boolean;
  existing_code text;
BEGIN
  -- Check if the plan is referral-eligible
  SELECT referral_eligible INTO plan_is_referral_eligible
  FROM card_plans WHERE id = p_plan_id;
  
  IF plan_is_referral_eligible = true THEN
    -- Check existing referral code
    SELECT referral_code INTO existing_code FROM profiles WHERE id = p_user_id;
    
    -- Update profile with referral access and generate code if needed
    UPDATE profiles
    SET 
      has_referral_access = true,
      referral_code = COALESCE(existing_code, generate_referral_code())
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- 9. Function to process payment and update card status
CREATE OR REPLACE FUNCTION public.process_card_payment(
  p_card_id uuid,
  p_user_id uuid,
  p_plan_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_provider_reference text DEFAULT NULL,
  p_evidence_url text DEFAULT NULL,
  p_is_admin_override boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_payment_id uuid;
  referrer_code text;
  referrer_id uuid;
BEGIN
  -- Insert payment record
  INSERT INTO payments (user_id, card_id, plan_id, amount, payment_method, provider_reference, evidence_url, status)
  VALUES (p_user_id, p_card_id, p_plan_id, p_amount, p_payment_method, p_provider_reference, p_evidence_url, 'paid')
  RETURNING id INTO new_payment_id;
  
  -- Update card as paid
  UPDATE cards
  SET 
    is_paid = true,
    paid_at = now(),
    paid_overridden_by_admin = p_is_admin_override,
    plan_id = p_plan_id
  WHERE id = p_card_id;
  
  -- Activate referral access if plan is eligible
  PERFORM activate_referral_access(p_user_id, p_plan_id);
  
  -- Check for referrer (stored in profiles metadata or passed separately)
  -- This would be handled by the application layer
  
  RETURN new_payment_id;
END;
$$;

-- 10. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_card_id ON public.payments(card_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_cards_plan_id ON public.cards(plan_id);