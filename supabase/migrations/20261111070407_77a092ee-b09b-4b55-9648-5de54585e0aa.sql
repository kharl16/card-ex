-- 1) First card is published automatically when its free week starts
CREATE OR REPLACE FUNCTION public.assign_card_free_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ends timestamptz := now() + interval '7 days';
BEGIN
  NEW.trial_ends_at := NULL;
  IF NEW.user_id IS NULL OR COALESCE(NEW.is_paid,false) OR COALESCE(NEW.is_template,false)
     OR public.is_super_admin(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.free_access_grants (user_id, card_id, source, ends_at)
  VALUES (NEW.user_id, NEW.id, 'new_cardholder', v_ends)
  ON CONFLICT (user_id) DO NOTHING;
  IF FOUND THEN
    NEW.trial_ends_at := v_ends;
    IF public.can_publish(NEW.user_id) THEN
      NEW.is_published := true;
      NEW.published_at := COALESCE(NEW.published_at, now());
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- 2) Visitors stop seeing an unpaid card the moment its free week ends (not up to an hour later)
DROP POLICY IF EXISTS "Public can view published cards" ON public.cards;
CREATE POLICY "Public can view published cards" ON public.cards
  FOR SELECT
  USING (
    is_published = true
    AND (COALESCE(is_paid, false) OR trial_ends_at IS NULL OR trial_ends_at > now())
  );

-- 3) Pause notice shows as soon as the week ends, even before the hourly unpublish runs
CREATE OR REPLACE FUNCTION public.get_card_pause_state(p_slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.cards
    WHERE (slug = p_slug OR custom_slug = p_slug)
      AND COALESCE(is_paid,false) = false
      AND trial_ends_at IS NOT NULL AND trial_ends_at <= now()
  );
$function$;

-- 4) Account lock: whole app closes (except activation) once the free week ends unpaid
CREATE OR REPLACE FUNCTION public.get_free_access_lock()
 RETURNS TABLE(locked boolean, card_id uuid, ended_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(
      g.ends_at IS NOT NULL
      AND g.ends_at <= now()
      AND NOT public.is_paid_member(auth.uid())
      AND NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false),
      false
    ) AS locked,
    (SELECT c.id FROM public.cards c
      WHERE c.user_id = auth.uid() AND NOT COALESCE(c.is_template,false)
      ORDER BY (c.id = g.card_id) DESC NULLS LAST, c.created_at
      LIMIT 1) AS card_id,
    g.ends_at AS ended_at
  FROM (SELECT auth.uid() AS uid) me
  LEFT JOIN public.free_access_grants g ON g.user_id = me.uid
  WHERE me.uid IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.get_free_access_lock() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_free_access_lock() TO authenticated;

-- 5) Existing unpaid members get their own 7-day week starting now
WITH eligible AS (
  SELECT g.user_id
  FROM public.free_access_grants g
  WHERE g.source = 'existing_member'
    AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.user_id = g.user_id AND c.is_paid)
    AND EXISTS (SELECT 1 FROM public.cards c WHERE c.user_id = g.user_id AND NOT COALESCE(c.is_template,false))
    AND NOT public.is_super_admin(g.user_id)
    AND NOT COALESCE(public.has_role(g.user_id, 'admin'::public.app_role), false)
), upd_grants AS (
  UPDATE public.free_access_grants g
  SET source = 'existing_member_week', ends_at = now() + interval '7 days',
      card_id = COALESCE(g.card_id, (SELECT c.id FROM public.cards c
                 WHERE c.user_id = g.user_id AND NOT COALESCE(c.is_template,false)
                 ORDER BY c.created_at LIMIT 1))
  FROM eligible e WHERE g.user_id = e.user_id
  RETURNING g.user_id, g.ends_at
)
UPDATE public.cards c
SET trial_ends_at = u.ends_at
FROM upd_grants u
WHERE c.user_id = u.user_id AND NOT COALESCE(c.is_template,false) AND NOT COALESCE(c.is_paid,false);