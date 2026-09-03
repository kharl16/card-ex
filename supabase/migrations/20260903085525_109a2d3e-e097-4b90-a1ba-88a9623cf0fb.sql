REVOKE EXECUTE ON FUNCTION public.cleanup_old_signup_attempts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_signup_attempts() TO service_role;