CREATE TABLE public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.card_plans(id),
  checkout_session_id text NOT NULL UNIQUE,
  checkout_url text,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paymongo_payment_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX idx_payment_sessions_user ON public.payment_sessions(user_id);
CREATE INDEX idx_payment_sessions_card ON public.payment_sessions(card_id);
CREATE INDEX idx_payment_sessions_checkout ON public.payment_sessions(checkout_session_id);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment sessions"
ON public.payment_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE TRIGGER update_payment_sessions_updated_at
BEFORE UPDATE ON public.payment_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();