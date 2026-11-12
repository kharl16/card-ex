ALTER TABLE public.free_access_grants
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_notice_sent_at timestamptz;

-- Reserve the free-week emails that are due right now (each sent once per user).
-- 'reminder': free week ends within 2 days. 'ended': free week ended in the last 3 days.
CREATE OR REPLACE FUNCTION public.claim_free_access_emails()
 RETURNS TABLE(user_id uuid, card_id uuid, kind text, ends_at timestamptz)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT g.user_id AS uid,
           CASE WHEN g.ends_at <= now() THEN 'ended' ELSE 'reminder' END AS k
    FROM public.free_access_grants g
    WHERE g.ends_at IS NOT NULL
      AND (
        (g.ends_at > now() AND g.ends_at <= now() + interval '2 days'
          AND g.reminder_sent_at IS NULL AND g.ended_notice_sent_at IS NULL)
        OR
        (g.ends_at <= now() AND g.ends_at > now() - interval '3 days'
          AND g.ended_notice_sent_at IS NULL)
      )
      AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.user_id = g.user_id AND COALESCE(c.is_paid,false))
      AND NOT public.is_super_admin(g.user_id)
      AND NOT COALESCE(public.has_role(g.user_id, 'admin'::public.app_role), false)
    FOR UPDATE OF g SKIP LOCKED
  ), claimed AS (
    UPDATE public.free_access_grants g
    SET reminder_sent_at = CASE WHEN d.k = 'reminder' THEN now() ELSE COALESCE(g.reminder_sent_at, now()) END,
        ended_notice_sent_at = CASE WHEN d.k = 'ended' THEN now() ELSE g.ended_notice_sent_at END
    FROM due d
    WHERE g.user_id = d.uid
    RETURNING g.user_id, g.card_id, d.k, g.ends_at
  )
  SELECT c.user_id, c.card_id, c.k, c.ends_at FROM claimed c;
END $function$;

-- Undo a reservation when the email could not be delivered, so the next run retries it.
CREATE OR REPLACE FUNCTION public.release_free_access_email(_user_id uuid, _kind text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.free_access_grants
  SET reminder_sent_at = CASE WHEN _kind = 'reminder' THEN NULL ELSE reminder_sent_at END,
      ended_notice_sent_at = CASE WHEN _kind = 'ended' THEN NULL ELSE ended_notice_sent_at END
  WHERE user_id = _user_id;
$function$;

REVOKE ALL ON FUNCTION public.claim_free_access_emails() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_free_access_email(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_free_access_emails() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_free_access_email(uuid, text) TO service_role;