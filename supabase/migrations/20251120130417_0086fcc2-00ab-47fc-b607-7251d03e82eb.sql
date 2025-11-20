-- Fix RLS enabled but no policies warning by adding explicit deny-all policies
-- for service-role-only tables

-- Rate limits table: Only accessed by edge functions via service role
CREATE POLICY "Service role only access"
ON public.rate_limits
FOR ALL
USING (false);

COMMENT ON TABLE public.rate_limits IS 
  'Internal rate limiting table. Access restricted to service role only via edge functions.';

-- OTP tokens table already has a deny-all policy, but let's ensure it's documented
COMMENT ON TABLE public.otp_tokens IS 
  'One-time password tokens for authentication. Access restricted to auth system only.';