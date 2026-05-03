ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iam_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;