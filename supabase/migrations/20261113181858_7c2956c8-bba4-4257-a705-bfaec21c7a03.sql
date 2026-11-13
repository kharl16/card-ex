REVOKE UPDATE, DELETE, TRUNCATE ON public.gcash_payment_submissions FROM anon, authenticated;
REVOKE ALL ON public.gcash_payment_submissions FROM anon;
REVOKE DELETE, TRUNCATE ON public.gcash_payment_settings FROM anon, authenticated;
REVOKE ALL ON public.gcash_payment_settings FROM anon;