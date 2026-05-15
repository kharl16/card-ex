ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS show_referral_earnings boolean NOT NULL DEFAULT false;
UPDATE public.cards SET show_daily_quote = true WHERE show_daily_quote IS DISTINCT FROM true;