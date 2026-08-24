ALTER TABLE public.daily_quotes ADD COLUMN IF NOT EXISTS business_action text;

GRANT SELECT ON public.daily_quotes TO anon, authenticated;
GRANT ALL ON public.daily_quotes TO service_role;