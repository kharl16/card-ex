-- Manually trust Maria Grace Mulato's iPhone Safari device to unblock dashboard access
-- (her OTP email never arrived due to email infra issue)
INSERT INTO public.trusted_devices (user_id, device_fingerprint_hash, device_label, user_agent)
SELECT
  '3a404b5b-f235-4289-8e59-9c5321b42fb2',
  device_fingerprint_hash,
  device_label,
  user_agent
FROM public.device_approval_requests
WHERE user_id = '3a404b5b-f235-4289-8e59-9c5321b42fb2'
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (user_id, device_fingerprint_hash) DO NOTHING;

UPDATE public.device_approval_requests
SET status = 'approved', resolved_at = now()
WHERE user_id = '3a404b5b-f235-4289-8e59-9c5321b42fb2'
  AND status = 'pending';